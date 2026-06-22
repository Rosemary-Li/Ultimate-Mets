// MLB public image URL helpers (stable CDN patterns — not scraping).

/** Transparent-background player headshot (good for circular avatars). */
export const headshot = (playerId: number | string) =>
  `https://midfield.mlbstatic.com/v1/people/${playerId}/spots/120`;

/**
 * Larger circular avatar (240px transparent cutout). Uses the same "spots"
 * framing as the small headshots so it sits cleanly in a round frame — the
 * wider JPEG headshot crops at the neck when cover-fit into a circle.
 */
export const headshotLarge = (playerId: number | string) =>
  `https://midfield.mlbstatic.com/v1/people/${playerId}/spots/240`;

/** Team logo (SVG). */
export const teamLogo = (teamId: number | string) =>
  `https://www.mlbstatic.com/team-logos/${teamId}.svg`;

/**
 * Best photo URL for a player row: the resolved `photo_url` (a real MLB headshot
 * or a Wikimedia photo, populated by data-pipeline/ingest_player_photos.py) when
 * we have one, otherwise the live MLB headshot endpoint. The MLB endpoint returns
 * a grey silhouette for players it has no photo of, so prefer photo_url.
 */
export const photoOf = (p: { photo_url?: string | null; player_id: number }) =>
  p.photo_url ?? headshot(p.player_id);

/** Same as photoOf but falls back to the larger MLB headshot (profile hero). */
export const photoOfLarge = (p: { photo_url?: string | null; player_id: number }) =>
  p.photo_url ?? headshotLarge(p.player_id);
