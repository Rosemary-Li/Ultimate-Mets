import Link from "next/link";
import { getMedia } from "@/lib/db";

export const dynamic = "force-dynamic";

const TYPES = [
  { key: "", label: "All" },
  { key: "video", label: "Videos" },
  { key: "article", label: "Articles" },
  { key: "photo", label: "Photos" },
];

const TYPE_BADGE: Record<string, string> = {
  video: "▶ Video",
  article: "📄 Article",
  photo: "📷 Photo",
};

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const items = await getMedia({ type: type || undefined, limit: 150 });

  return (
    <div className="md-wrap">
      <h1 className="md-page-title">Media</h1>
      <p className="md-page-sub">
        Highlights, game recaps & photos — straight from MLB, updated daily.
      </p>

      <div className="md-filters">
        {TYPES.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/media?type=${t.key}` : "/media"}
            className={`md-chip ${(type ?? "") === t.key ? "active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="md-empty">
          No media yet. Run ingest_media.py to pull MLB highlights & recaps.
        </div>
      ) : (
        <div className="md-grid">
          {items.map((m) => {
            const isVideo = m.media_type === "video";
            return (
              <a
                key={m.id}
                href={m.url ?? "#"}
                className="md-card"
                target="_blank"
                rel="noreferrer"
              >
                <span className="md-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumb_url ?? ""} alt={m.title ?? ""} loading="lazy" />
                  <span className={`md-badge ${m.media_type ?? ""}`}>
                    {TYPE_BADGE[m.media_type ?? ""] ?? m.media_type}
                  </span>
                  {isVideo && <span className="md-play">▶</span>}
                  {isVideo && m.duration && (
                    <span className="md-dur">{m.duration.replace(/^00:/, "")}</span>
                  )}
                </span>
                <div className="md-info">
                  <div className="md-title">{m.title}</div>
                  {m.description && <div className="md-desc">{m.description}</div>}
                  <div className="md-meta">
                    {[m.published_at, m.source].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
