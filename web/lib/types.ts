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
