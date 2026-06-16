# Pipeline container for a Cloud Run Job, triggered daily by Cloud Scheduler.
FROM python:3.12-slim
WORKDIR /app
# psql is used by run_daily.sh to REFRESH the materialized views.
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# DATABASE_URL is provided at runtime (env / Secret Manager).
# Runs every ingest stage in order, then refreshes the materialized views.
CMD ["bash", "run_daily.sh"]
