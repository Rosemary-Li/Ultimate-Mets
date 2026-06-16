import Link from "next/link";
import { getMedia } from "@/lib/db";

export const dynamic = "force-dynamic";

const TYPES = ["all", "video", "photo", "article", "audio"];

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const items = await getMedia({ type: type && type !== "all" ? type : undefined });

  return (
    <div className="md-wrap">
      <h1 className="md-page-title">Media</h1>
      <p className="md-page-sub">
        Videos, photos, articles, and podcasts from Mets history.
      </p>

      <div className="md-filters">
        {TYPES.map((t) => (
          <Link
            key={t}
            href={t === "all" ? "/media" : `/media?type=${t}`}
            className={`md-chip ${(type ?? "all") === t ? "active" : ""}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="md-empty">
          No media items. Run seed_editorial.py to populate the archive.
        </div>
      ) : (
        <div className="md-grid">
          {items.map((m) => (
            <a
              key={m.id}
              href={m.url ?? "#"}
              className={`md-card ${m.featured ? "feat" : ""}`}
            >
              <span className={`md-type ${m.media_type ?? ""}`}>
                {m.media_type}
              </span>
              <div className="md-title">{m.title}</div>
              <div className="md-desc">{m.description}</div>
              <div className="md-meta">
                {m.era && <span>{m.era}</span>}
                {m.season && <span>{m.season}</span>}
                {m.player_name && <span>{m.player_name}</span>}
                {m.source && <span>· {m.source}</span>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
