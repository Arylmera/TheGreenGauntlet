import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BonusDb, BonusDbError } from '../bonusDb.js';

describe('BonusDb', () => {
  let tmp: string;
  let db: BonusDb;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tgg-bonus-'));
    db = new BonusDb(path.join(tmp, 'bonus.sqlite'));
  });
  afterEach(async () => {
    db.close();
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('seeds new teams with all categories at 0 and active=1', () => {
    db.upsertTeamSeeds([
      { teamId: 't1', teamName: 'Team One' },
      { teamId: 't2', teamName: 'Team Two' },
    ]);
    const rows = db.getAll();
    expect(rows).toHaveLength(2);
    expect(
      rows.every(
        (r) =>
          r.mario_points === 0 &&
          r.crokinole_points === 0 &&
          r.helping_points === 0 &&
          r.active === 1,
      ),
    ).toBe(true);
  });

  it('is idempotent — re-seeding does not reset category points', () => {
    db.upsertTeamSeeds([{ teamId: 't1', teamName: 'Team One' }]);
    db.applyBatchDeltas([{ teamId: 't1', category: 'mario', delta: 50 }], 'admin');
    db.upsertTeamSeeds([{ teamId: 't1', teamName: 'Team One' }]);
    expect(db.getAll()[0]?.mario_points).toBe(50);
  });

  it('updates team_name when renamed', () => {
    db.upsertTeamSeeds([{ teamId: 't1', teamName: 'Old Name' }]);
    db.upsertTeamSeeds([{ teamId: 't1', teamName: 'New Name' }]);
    expect(db.getAll()[0]?.team_name).toBe('New Name');
  });

  it('applies batch deltas across categories atomically', () => {
    db.upsertTeamSeeds([
      { teamId: 'a', teamName: 'A' },
      { teamId: 'b', teamName: 'B' },
    ]);
    db.applyBatchDeltas(
      [
        { teamId: 'a', category: 'mario', delta: 30 },
        { teamId: 'a', category: 'crokinole', delta: 10 },
        { teamId: 'b', category: 'helping', delta: 5 },
      ],
      'admin',
    );
    const rows = db.getAll();
    const a = rows.find((r) => r.team_id === 'a');
    const b = rows.find((r) => r.team_id === 'b');
    expect(a?.mario_points).toBe(30);
    expect(a?.crokinole_points).toBe(10);
    expect(b?.helping_points).toBe(5);
  });

  it('sums duplicate team+category in a single batch', () => {
    db.upsertTeamSeeds([{ teamId: 'a', teamName: 'A' }]);
    db.applyBatchDeltas(
      [
        { teamId: 'a', category: 'mario', delta: 20 },
        { teamId: 'a', category: 'mario', delta: 7 },
      ],
      'admin',
    );
    expect(db.getAll()[0]?.mario_points).toBe(27);
  });

  it('rejects entire batch if any category result < 0', () => {
    db.upsertTeamSeeds([
      { teamId: 'a', teamName: 'A' },
      { teamId: 'b', teamName: 'B' },
    ]);
    db.applyBatchDeltas([{ teamId: 'a', category: 'mario', delta: 20 }], 'admin');
    expect(() =>
      db.applyBatchDeltas(
        [
          { teamId: 'a', category: 'mario', delta: 5 },
          { teamId: 'b', category: 'crokinole', delta: -100 },
        ],
        'admin',
      ),
    ).toThrow(BonusDbError);
    expect(db.getAll().find((r) => r.team_id === 'a')?.mario_points).toBe(20);
  });

  it('rejects unknown team in batch', () => {
    db.upsertTeamSeeds([{ teamId: 'a', teamName: 'A' }]);
    expect(() =>
      db.applyBatchDeltas([{ teamId: 'zz', category: 'mario', delta: 5 }], 'admin'),
    ).toThrow(/unknown team/);
  });

  it('setActive toggles active flag', () => {
    db.upsertTeamSeeds([{ teamId: 'a', teamName: 'A' }]);
    db.setActive('a', false, 'admin');
    expect(db.getAll()[0]?.active).toBe(0);
    db.setActive('a', true, 'admin');
    expect(db.getAll()[0]?.active).toBe(1);
  });

  it('setActive on unknown team throws', () => {
    expect(() => db.setActive('nope', false, 'admin')).toThrow(/unknown team/);
  });

  it('persists across BonusDb instances (WAL)', () => {
    db.upsertTeamSeeds([{ teamId: 'a', teamName: 'A' }]);
    db.applyBatchDeltas([{ teamId: 'a', category: 'helping', delta: 42 }], 'admin');
    db.close();
    const db2 = new BonusDb(path.join(tmp, 'bonus.sqlite'));
    expect(db2.getAll()[0]?.helping_points).toBe(42);
    db2.close();
  });
});
