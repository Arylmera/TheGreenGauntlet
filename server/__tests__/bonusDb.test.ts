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

  it('seeds new teams with points=0 and active=1', () => {
    db.upsertTeamSeeds([
      { teamId: 't1', teamName: 'Team One' },
      { teamId: 't2', teamName: 'Team Two' },
    ]);
    const rows = db.getAll();
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.points === 0 && r.active === 1)).toBe(true);
  });

  it('is idempotent — re-seeding does not reset points', () => {
    db.upsertTeamSeeds([{ teamId: 't1', teamName: 'Team One' }]);
    db.applyBatchDeltas([{ teamId: 't1', delta: 50 }], 'admin');
    db.upsertTeamSeeds([{ teamId: 't1', teamName: 'Team One' }]);
    expect(db.getAll()[0]?.points).toBe(50);
  });

  it('updates team_name when renamed', () => {
    db.upsertTeamSeeds([{ teamId: 't1', teamName: 'Old Name' }]);
    db.upsertTeamSeeds([{ teamId: 't1', teamName: 'New Name' }]);
    expect(db.getAll()[0]?.team_name).toBe('New Name');
  });

  it('applies batch deltas atomically', () => {
    db.upsertTeamSeeds([
      { teamId: 'a', teamName: 'A' },
      { teamId: 'b', teamName: 'B' },
    ]);
    db.applyBatchDeltas(
      [
        { teamId: 'a', delta: 30 },
        { teamId: 'b', delta: 10 },
      ],
      'admin',
    );
    const rows = db.getAll();
    expect(rows.find((r) => r.team_id === 'a')?.points).toBe(30);
    expect(rows.find((r) => r.team_id === 'b')?.points).toBe(10);
  });

  it('rejects entire batch if any result < 0', () => {
    db.upsertTeamSeeds([
      { teamId: 'a', teamName: 'A' },
      { teamId: 'b', teamName: 'B' },
    ]);
    db.applyBatchDeltas([{ teamId: 'a', delta: 20 }], 'admin');
    expect(() =>
      db.applyBatchDeltas(
        [
          { teamId: 'a', delta: 5 },
          { teamId: 'b', delta: -100 },
        ],
        'admin',
      ),
    ).toThrow(BonusDbError);
    // a should remain unchanged because tx was rolled back.
    expect(db.getAll().find((r) => r.team_id === 'a')?.points).toBe(20);
  });

  it('rejects unknown team in batch', () => {
    db.upsertTeamSeeds([{ teamId: 'a', teamName: 'A' }]);
    expect(() =>
      db.applyBatchDeltas([{ teamId: 'zz', delta: 5 }], 'admin'),
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
    db.applyBatchDeltas([{ teamId: 'a', delta: 42 }], 'admin');
    db.close();
    const db2 = new BonusDb(path.join(tmp, 'bonus.sqlite'));
    expect(db2.getAll()[0]?.points).toBe(42);
    db2.close();
  });
});
