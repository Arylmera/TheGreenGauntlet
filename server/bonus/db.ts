import path from 'node:path';
import fs from 'node:fs';
import Database, { type Database as Db } from 'better-sqlite3';
import {
  BonusDbError,
  CATEGORY_COLUMNS,
  isBonusCategory,
  type BonusDelta,
  type TeamBonusRow,
  type TeamSeed,
} from './types.js';
import { migrate } from './schema.js';

export class BonusDb {
  private readonly db: Db;
  private readonly now: () => string;

  constructor(filePath: string, deps: { now?: () => string } = {}) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new Database(filePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.now = deps.now ?? (() => new Date().toISOString());
    migrate(this.db);
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

  getAll(): TeamBonusRow[] {
    return this.db
      .prepare(
        `SELECT team_id, team_name, mario_points, crokinole_points, helping_points,
                active, updated_at, updated_by
         FROM team_bonus
         ORDER BY team_name`,
      )
      .all() as TeamBonusRow[];
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
        const row = touched.get(d.teamId) ?? (getRow.get(d.teamId) as TeamBonusRow | undefined);
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
