# Deploying Ultimate Mets to Google Cloud (GCP)

Target architecture:

```
Cloud Scheduler (daily) ─► Cloud Run Job (data-pipeline) ─┐
                                                          ├─► Cloud SQL (PostgreSQL)
                          Cloud Run Service (web/Next.js) ─┘  ◄─ users
```

- **Cloud SQL for PostgreSQL** — the shared database.
- **Cloud Run service** — the Next.js app (web/), reads the DB.
- **Cloud Run job + Cloud Scheduler** — the Python pipeline (data-pipeline/), runs daily.
- **Secret Manager** — holds `DATABASE_URL`.

You run these steps with your own GCP project and credentials. Set once:

```bash
export PROJECT_ID=your-project
export REGION=us-east1
gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  cloudscheduler.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com
```

## 1. Cloud SQL (PostgreSQL)

```bash
gcloud sql instances create mets-pg --database-version=POSTGRES_16 \
  --tier=db-f1-micro --region=$REGION
gcloud sql databases create ultimate_mets --instance=mets-pg
gcloud sql users set-password postgres --instance=mets-pg --password='STRONG_PW'
```

Apply the schema (via the Cloud SQL Auth Proxy or `gcloud sql connect`):

```bash
gcloud sql connect mets-pg --user=postgres --database=ultimate_mets
# then, at the psql prompt, run the files in data-pipeline/:
#   \i schema.sql
#   \i schema_editorial.sql
#   \i views.sql
#   \i roles.sql          -- edit the passwords first
```

Store the connection string (use the Cloud SQL socket form for Cloud Run):

```bash
# CONN = PROJECT:REGION:mets-pg
printf 'postgresql://postgres:STRONG_PW@/ultimate_mets?host=/cloudsql/%s' \
  "$PROJECT_ID:$REGION:mets-pg" | gcloud secrets create DATABASE_URL --data-file=-
```

## 2. Web app → Cloud Run service

```bash
cd web
gcloud run deploy ultimate-mets-web --source . --region=$REGION --allow-unauthenticated \
  --add-cloudsql-instances $PROJECT_ID:$REGION:mets-pg \
  --set-secrets DATABASE_URL=DATABASE_URL:latest
```

(`web/Dockerfile` builds the Next.js standalone image; Cloud Run sets `PORT=8080`.)

## 3. Pipeline → Cloud Run job + daily schedule

```bash
cd data-pipeline
gcloud run jobs deploy mets-pipeline --source . --region=$REGION \
  --add-cloudsql-instances $PROJECT_ID:$REGION:mets-pg \
  --set-secrets DATABASE_URL=DATABASE_URL:latest --task-timeout=1800

# Daily at 07:00 UTC (~3 AM ET) — runs run_daily.sh (ingest + refresh views)
gcloud scheduler jobs create http mets-pipeline-daily --location=$REGION \
  --schedule="0 7 * * *" \
  --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/mets-pipeline:run" \
  --http-method=POST --oauth-service-account-email=YOUR_RUN_INVOKER_SA
```

First-time backfill (run the job once with overrides, or locally against the proxy):

```bash
gcloud run jobs execute mets-pipeline --region=$REGION
# or backfill specific seasons by running the ingest_*.py scripts with --start/--end
```

## Notes

- **Roles in production:** create the `mets_pipeline` / `mets_web` / `mets_editor`
  roles (data-pipeline/roles.sql) and point each service at the least-privileged one:
  the web service should connect as `mets_web` (read-only), the pipeline job as
  `mets_pipeline` (no write access to editorial tables). Store a separate DATABASE_URL
  secret per role.
- **Editorial content** (`seed_editorial.py`) is a one-time/occasional manual run, not
  part of the daily job — run it as `mets_editor`.
- The app degrades gracefully if the DB is unreachable (queries return empty), so a
  cold database won't crash the site.
- `db-f1-micro` is fine for this dataset; scale the tier up as history grows.
