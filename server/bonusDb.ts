import path from 'node:path';
import fs from 'node:fs';
import Database, { type Database as Db } from 'better-sqlite3';

export type TeamBonusRow = {
  team_id: string;
  team_name: string;
  points: number;
  active: number;
  updated_at: string;
  updated_by: string | null;
};

export type BonusDelta = { teamId: string; delta: number };

export type TeamSeed = { teamId: string; teamName: string };

export class BonusDbError extends Error {
  constructor(
    message: string,
    readonly code: 'NEGATIVE_TOTAL' | 'UNKNOWN_TEAM' | 'INVALID',
  ) {
    super(message);
    this.name = 'BonusDbError';
  }
}

const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS team_bonus (
    team_id     TEXT PRIMARY KEY,
    team_name   TEXT NOT NULL,
    points      INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1,
    updated_at  TEXT NOT NULL,
    updated_by  TEXT
  )`,
];

export class BonusDb {
  private readonly db: Db;
  private readonly now: () => string;

  constructor(filePath: string, deps: { now?: () => string } = {}) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new Database(filePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.now = deps.now ?? (() => new Date().toISOString());
    this.migrate();
  }

  private migrate(): void {
    for (const sql of MIGRATIONS) this.db.exec(sql);
  }

  close(): void {
    this.db.close();
  }

  /** Seed a team if it does not exist; update name if it changed. */
  upsertTeamSeed(seed: TeamSeed, updatedBy = 'system'): void {
    const now = this.now();
    const insert = this.db.prepare(
      `INSERT INTO team_bonus (team_id, team_name, points, active, updated_at, updated_by)
       VALUES (?, ?, 0, 1, ?, ?)
       ON CONFLICT(team_id) DO UPDATE SET
         team_name = excluded.team_name
       WHERE team_bonus.team_name != excluded.team_name`,
    );
    insert.run(seed.teamId, seed.teamName, now, updatedBy);
  }

  upsertTeamSeeds(seeds: readonly TeamSeed[], updatedBy = 'system'): void {
    const tx = this.db.transaction((items: readonly TeamSeed[]) => {
      for (const s of items) this.upsertTeamSeed(s, updatedBy);
    });
    tx(seeds);
  }

  listTeamsWithBonus(): TeamBonusRow[] {
    return this.db
      .prepare(
        `SELECT team_id, team_name, points, active, updated_at, updated_by
         FROM team_bonus
         ORDER BY team_name`,
      )
      .all() as TeamBonusRow[];
  }

  getAll(): TeamBonusRow[] {
    return this.listTeamsWithBonus();
  }

  /**
   * Apply a batch of deltas in a single transaction.
   * Rejects the entire batch if any resulting total would be < 0
   * or any teamId does not exist.
   */
  applyBatchDeltas(deltas: readonly BonusDelta[], updatedBy: string): TeamBonusRow[] {
    if (deltas.length === 0) return [];

    const getRow = this.db.prepare(
      `SELECT team_id, team_name, points, active, updated_at, updated_by
       FROM team_bonus WHERE team_id = ?`,
    );
    const update = this.db.prepare(
      `UPDATE team_bonus
       SET points = ?, updated_at = ?, updated_by = ?
       WHERE team_id = ?`,
    );

    const tx = this.db.transaction((items: readonly BonusDelta[]) => {
      const now = this.now();
      const updated: TeamBonusRow[] = [];
      for (const d of items) {
        const row = getRow.get(d.teamId) as TeamBonusRow | undefined;
        if (!row) throw new BonusDbError(`unknown team: ${d.teamId}`, 'UNKNOWN_TEAM');
        const delta = Number.isInteger(d.delta) ? d.delta : NaN;
        if (!Number.isFinite(delta)) {
          throw new BonusDbError(`invalid delta for ${d.teamId}`, 'INVALID');
        }
        const next = row.points + delta;
        if (next < 0) {
          throw new BonusDbError(
            `delta would drive ${d.teamId} below zero (current=${row.points}, delta=${delta})`,
            'NEGATIVE_TOTAL',
          );
        }
        update.run(next, now, updatedBy, d.teamId);
        updated.push({ ...row, points: next, updated_at: now, updated_by: updatedBy });
      }
      return updated;
    });

    return tx(deltas);
  }

  setActive(teamId: string, active: boolean, updatedBy: string): TeamBonusRow {
    const now = this.now();
    const res = this.db
      .prepare(
        `UPDATE team_bonus
         SET active = ?, updated_at = ?, updated_by = ?
         WHERE team_id = ?`,
      )
      .run(active ? 1 : 0, now, updatedBy, teamId);
    if (res.changes === 0) {
      throw new BonusDbError(`unknown team: ${teamId}`, 'UNKNOWN_TEAM');
    }
    const row = this.db
      .prepare(
        `SELECT team_id, team_name, points, active, updated_at, updated_by
         FROM team_bonus WHERE team_id = ?`,
      )
      .get(teamId) as TeamBonusRow;
    return row;
  }
}
