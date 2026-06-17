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
