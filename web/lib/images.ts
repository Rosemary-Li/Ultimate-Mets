// MLB public image URL helpers (stable CDN patterns — not scraping).

/** Transparent-background player headshot (good for circular avatars). */
export const headshot = (playerId: number | string) =>
  `https://midfield.mlbstatic.com/v1/people/${playerId}/spots/120`;

/** Larger headshot (JPEG). */
export const headshotLarge = (playerId: number | string) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/w_240,q_auto:good/v1/people/${playerId}/headshot/67/current`;

/** Team logo (SVG). */
export const teamLogo = (teamId: number | string) =>
  `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
