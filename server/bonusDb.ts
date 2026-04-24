import path from 'node:path';
import fs from 'node:fs';
import Database, { type Database as Db } from 'better-sqlite3';

export const BONUS_CATEGORIES = ['mario', 'crokinole', 'helping'] as const;
export type BonusCategory = (typeof BONUS_CATEGORIES)[number];

const CATEGORY_COLUMNS: Record<BonusCategory, string> = {
  mario: 'mario_points',
  crokinole: 'crokinole_points',
  helping: 'helping_points',
};

export function isBonusCategory(value: unknown): value is BonusCategory {
  return typeof value === 'string' && (BONUS_CATEGORIES as readonly string[]).includes(value);
}

export type TeamBonusRow = {
  team_id: string;
  team_name: string;
  mario_points: number;
  crokinole_points: number;
  helping_points: number;
  active: number;
  updated_at: string;
  updated_by: string | null;
};

export type BonusDelta = { teamId: string; category: BonusCategory; delta: number };

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

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS team_bonus (
  team_id          TEXT PRIMARY KEY,
  team_name        TEXT NOT NULL,
  mario_points     INTEGER NOT NULL DEFAULT 0,
  crokinole_points INTEGER NOT NULL DEFAULT 0,
  helping_points   INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT
)`;

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
    // v1 schema had a single `points` column. v1.1 replaces it with three
    // per-category columns. No prior event has been run on v1, so the safe
    // migration is to drop any legacy table and recreate fresh.
    const existing = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='team_bonus'")
      .get() as { name: string } | undefined;
    if (existing) {
      const columns = this.db.prepare('PRAGMA table_info(team_bonus)').all() as {
        name: string;
      }[];
      const names = new Set(columns.map((c) => c.name));
      const hasLegacy = names.has('points') && !names.has('mario_points');
      if (hasLegacy) {
        this.db.exec('DROP TABLE team_bonus');
      }
    }
    this.db.exec(CREATE_TABLE_SQL);
  }

  close(): void {
    this.db.close();
  }

  /** Seed a team if it does not exist; update name if it changed. */
  upsertTeamSeed(seed: TeamSeed, updatedBy = 'system'): void {
    const now = this.now();
    const insert = this.db.prepare(
      `INSERT INTO team_bonus (team_id, team_name, updated_at, updated_by)
       VALUES (?, ?, ?, ?)
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
        `SELECT team_id, team_name, mario_points, crokinole_points, helping_points,
                active, updated_at, updated_by
         FROM team_bonus
         ORDER BY team_name`,
      )
      .all() as TeamBonusRow[];
  }

  getAll(): TeamBonusRow[] {
    return this.listTeamsWithBonus();
  }

  /**
   * Apply a batch of category-tagged deltas in a single transaction.
   * Rejects the entire batch if any resulting per-category total would be < 0
   * or any teamId does not exist. Duplicate `{teamId, category}` entries in
   * one batch are summed sequentially (two `+5` entries apply as `+10`).
   */
  applyBatchDeltas(deltas: readonly BonusDelta[], updatedBy: string): TeamBonusRow[] {
    if (deltas.length === 0) return [];

    const getRow = this.db.prepare(
      `SELECT team_id, team_name, mario_points, crokinole_points, helping_points,
              active, updated_at, updated_by
       FROM team_bonus WHERE team_id = ?`,
    );

    const tx = this.db.transaction((items: readonly BonusDelta[]) => {
      const now = this.now();
      const touched = new Map<string, TeamBonusRow>();
      for (const d of items) {
        if (!isBonusCategory(d.category)) {
          throw new BonusDbError(`invalid category: ${String(d.category)}`, 'INVALID');
        }
        const column = CATEGORY_COLUMNS[d.category];
        const row = (touched.get(d.teamId) ?? (getRow.get(d.teamId) as TeamBonusRow | undefined));
        if (!row) throw new BonusDbError(`unknown team: ${d.teamId}`, 'UNKNOWN_TEAM');
        const delta = Number.isInteger(d.delta) ? d.delta : NaN;
        if (!Number.isFinite(delta)) {
          throw new BonusDbError(`invalid delta for ${d.teamId}`, 'INVALID');
        }
        const current = row[column as keyof TeamBonusRow] as number;
        const next = current + delta;
        if (next < 0) {
          throw new BonusDbError(
            `delta would drive ${d.teamId}.${d.category} below zero (current=${current}, delta=${delta})`,
            'NEGATIVE_TOTAL',
          );
        }
        const updatedRow: TeamBonusRow = {
          ...row,
          [column]: next,
          updated_at: now,
          updated_by: updatedBy,
        } as TeamBonusRow;
        touched.set(d.teamId, updatedRow);
      }

      for (const row of touched.values()) {
        this.db
          .prepare(
            `UPDATE team_bonus
             SET mario_points = ?, crokinole_points = ?, helping_points = ?,
                 updated_at = ?, updated_by = ?
             WHERE team_id = ?`,
          )
          .run(
            row.mario_points,
            row.crokinole_points,
            row.helping_points,
            row.updated_at,
            row.updated_by,
            row.team_id,
          );
      }
      return [...touched.values()];
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
        `SELECT team_id, team_name, mario_points, crokinole_points, helping_points,
                active, updated_at, updated_by
         FROM team_bonus WHERE team_id = ?`,
      )
      .get(teamId) as TeamBonusRow;
    return row;
  }
}
