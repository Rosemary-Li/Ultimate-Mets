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

export interface Trending {
  id: number;
  position: number | null;
  title: string | null;
  subtitle: string | null;
  href: string | null;
}

export interface TodayHistory {
  id: number;
  event_month: number;
  event_day: number;
  event_year: number | null;
  headline: string | null;
  blurb: string | null;
  meta: string | null;
}

export interface MediaItem {
  id: number;
  external_id: string | null;
  media_type: string | null;
  title: string | null;
  description: string | null;
  era: string | null;
  season: number | null;
  game_pk: number | null;
  player_name: string | null;
  source: string | null;
  url: string | null;
  thumb_url: string | null;
  published_at: string | null;
  duration: string | null;
  featured: boolean | null;
}

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
  // present when listed via the directory view: appeared for the Mets in the
  // latest season in the DB.
  is_current?: boolean;
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

export interface PostseasonSeries {
  season: number;
  game_type: string;
  round_order: number;
  series_description: string | null;
  games: number;
  mets_wins: number;
  mets_losses: number;
  start_date: string | null;
  end_date: string | null;
}

export interface SiteStats {
  seasons: number;
  players: number;
  games: number;
  postseasons: number;
  first_season: number | null;
  last_season: number | null;
}

export interface BoxBatting {
  player_id: number;
  full_name: string | null;
  team_id: number | null;
  is_mets: number | null;
  batting_order: number | null;
  position: string | null;
  at_bats: number | null;
  runs: number | null;
  hits: number | null;
  doubles: number | null;
  triples: number | null;
  home_runs: number | null;
  rbi: number | null;
  walks: number | null;
  strike_outs: number | null;
  stolen_bases: number | null;
}

export interface BoxPitching {
  player_id: number;
  full_name: string | null;
  team_id: number | null;
  is_mets: number | null;
  innings_pitched: string | null;
  hits: number | null;
  runs: number | null;
  earned_runs: number | null;
  walks: number | null;
  strike_outs: number | null;
  home_runs: number | null;
}

export interface LinescoreInning {
  game_pk: number;
  inning_num: number;
  away_runs: number | null;
  home_runs: number | null;
  away_hits: number | null;
  home_hits: number | null;
  away_errors: number | null;
  home_errors: number | null;
}

export interface TeamSeason {
  season: number;
  team_id: number | null;
  wins: number | null;
  losses: number | null;
  win_pct: string | null;
  games_back: string | null;
  division_id: number | null;
  division_rank: string | null;
  league_rank: string | null;
  runs_scored: number | null;
  runs_allowed: number | null;
  run_diff: number | null;
  streak: string | null;
  home_attendance?: number | null;
}
