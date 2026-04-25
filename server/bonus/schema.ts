import type { Database as Db } from 'better-sqlite3';

export const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS team_bonus (
  team_id          TEXT PRIMARY KEY,
  team_name        TEXT NOT NULL,
  mario_points     INTEGER NOT NULL DEFAULT 0,
  crokinole_points INTEGER NOT NULL DEFAULT 0,
  helping_points   INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT
)`;

export const CREATE_ANNOUNCEMENT_TABLE_SQL = `CREATE TABLE IF NOT EXISTS announcement (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  message     TEXT,
  message_id  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
)`;

/**
 * v1 schema had a single `points` column. v1.1 replaces it with three
 * per-category columns. No prior event has been run on v1, so the safe
 * migration is to drop any legacy table and recreate fresh.
 */
export function migrate(db: Db): void {
  const existing = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='team_bonus'")
    .get() as { name: string } | undefined;
  if (existing) {
    const columns = db.prepare('PRAGMA table_info(team_bonus)').all() as { name: string }[];
    const names = new Set(columns.map((c) => c.name));
    const hasLegacy = names.has('points') && !names.has('mario_points');
    if (hasLegacy) {
      db.exec('DROP TABLE team_bonus');
    }
  }
  db.exec(CREATE_TABLE_SQL);
  db.exec(CREATE_ANNOUNCEMENT_TABLE_SQL);
  db.prepare(
    `INSERT OR IGNORE INTO announcement (id, message, message_id, updated_at, updated_by)
     VALUES (1, NULL, NULL, ?, ?)`,
  ).run(new Date().toISOString(), 'system');
}
