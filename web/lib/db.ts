import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type { Game } from "./types";

// The data pipeline writes its SQLite file here. Override with METS_DB_PATH.
const DEFAULT_DB_PATH = path.join(
  process.cwd(),
  "..",
  "data-pipeline",
  "mets.db",
);

let _db: DatabaseSync | null = null;

function getDb(): DatabaseSync | null {
  if (_db) return _db;
  const dbPath = process.env.METS_DB_PATH ?? DEFAULT_DB_PATH;
  if (!fs.existsSync(dbPath)) {
    // Pipeline hasn't run yet — callers fall back to illustrative data.
    return null;
  }
  _db = new DatabaseSync(dbPath, { readOnly: true });
  return _db;
}

/** Most recent final games, newest first. Empty if the DB is absent. */
export function getRecentGames(limit = 10): Game[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare(
      `SELECT * FROM games
       WHERE status_code = 'F'
       ORDER BY official_date DESC, game_number DESC
       LIMIT ?`,
    )
    .all(limit) as unknown as Game[];
}

/** A single game by its MLB game_pk, or null. */
export function getGame(gamePk: number): Game | null {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare(`SELECT * FROM games WHERE game_pk = ?`).get(gamePk);
  return (row as unknown as Game) ?? null;
}

/** Games for a season, in chronological order. */
export function getGamesBySeason(season: number): Game[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare(
      `SELECT * FROM games WHERE season = ? ORDER BY official_date, game_number`,
    )
    .all(season) as unknown as Game[];
}
