// Shared data types. The `Game` shape mirrors the `games` table produced by the
// Python data pipeline (../data-pipeline/schema.sql).

export interface Game {
  game_pk: number;
  official_date: string | null;
  game_datetime: string | null;
  season: number | null;
  game_type: string | null;
  status: string | null;
  status_code: string | null;
  double_header: string | null;
  game_number: number | null;
  home_team_id: number | null;
  home_team_name: string | null;
  home_score: number | null;
  home_is_winner: number | null;
  away_team_id: number | null;
  away_team_name: string | null;
  away_score: number | null;
  away_is_winner: number | null;
  venue_id: number | null;
  venue_name: string | null;
  mets_is_home: number | null;
  updated_at: string | null;
}

export const METS_TEAM_ID = 121;

export interface Player {
  player_id: number;
  full_name: string | null;
  primary_number: string | null;
  primary_position: string | null;
  position_type: string | null;
  bat_side: string | null;
  pitch_hand: string | null;
  birth_date: string | null;
  birth_city: string | null;
  birth_country: string | null;
  height: string | null;
  weight: number | null;
  mlb_debut_date: string | null;
  name_slug: string | null;
  active: boolean | null;
}

export interface SeasonBatting {
  player_id: number;
  season: number;
  games: number;
  at_bats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  home_runs: number;
  rbi: number;
  walks: number;
  strike_outs: number;
  stolen_bases: number;
  total_bases: number;
  avg: string | null;
  obp: string | null;
  slg: string | null;
}

export interface SeasonPitching {
  player_id: number;
  season: number;
  games: number;
  games_started: number;
  innings_pitched: string | null;
  hits: number;
  runs: number;
  earned_runs: number;
  home_runs: number;
  walks: number;
  strike_outs: number;
  wins: number;
  losses: number;
  saves: number;
  era: string | null;
  whip: string | null;
}

export interface SiteStats {
  seasons: number;
  players: number;
  games: number;
  postseasons: number;
}
