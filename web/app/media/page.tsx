import Link from "next/link";
import { getMedia, getGameArticleLinks } from "@/lib/db";
import type { MediaItem } from "@/lib/types";

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
  const [raw, articleLinks] = await Promise.all([
    getMedia({ type: type || undefined, limit: 150 }),
    getGameArticleLinks(),
  ]);

  // In the "All" view, a recap shows up as both an article and a near-identical
  // photo (same game + title) — drop the photo duplicate there.
  let items = raw;
  if (!type) {
    const articleKeys = new Set(
      raw
        .filter((m) => m.media_type === "article")
        .map((m) => `${m.game_pk}|${m.title}`),
    );
    items = raw.filter(
      (m) => !(m.media_type === "photo" && articleKeys.has(`${m.game_pk}|${m.title}`)),
    );
  }

  // Link, don't host: every card points to an MLB.com page. Articles already do;
  // videos & photos link to the game's official recap (or its gameday page).
  const hrefFor = (m: MediaItem): string => {
    if (m.media_type === "article" && m.url) return m.url;
    if (m.game_pk) {
      return articleLinks[m.game_pk] ?? `https://www.mlb.com/gameday/${m.game_pk}`;
    }
    return m.url ?? "#";
  };

  return (
    <div className="md-wrap">
      <h1 className="md-page-title">Media</h1>
      <p className="md-page-sub">
        Highlights, recaps &amp; photos indexed from the official{" "}
        <a href="https://statsapi.mlb.com" target="_blank" rel="noreferrer">
          MLB Stats API
        </a>{" "}
        and updated daily — every item links out to MLB.com. Not affiliated with
        MLB or the New York Mets; all media © MLB.
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
          No media yet. Run ingest_media.py to pull MLB highlights &amp; recaps.
        </div>
      ) : (
        <div className="md-grid">
          {items.map((m) => {
            const isVideo = m.media_type === "video";
            return (
              <a
                key={m.id}
                href={hrefFor(m)}
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
                    {[m.published_at, m.source, "MLB.com ↗"]
                      .filter(Boolean)
                      .join(" · ")}
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
