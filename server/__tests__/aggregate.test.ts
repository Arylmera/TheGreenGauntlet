import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeaderboardAggregator, phaseFor, rankTeams } from '../aggregate.js';
import type { Account, ImmersiveLabClient } from '../immersiveLab.js';
import type { Env } from '../env.js';

const baseEnv = (overrides: Partial<Env> = {}): Env => ({
  IMMERSIVELAB_ACCESS_KEY: 'k',
  IMMERSIVELAB_SECRET_TOKEN: 's',
  IMMERSIVELAB_BASE_URL: 'https://example.test',
  EVENT_START_AT: '2026-05-01T09:00:00Z',
  EVENT_END_AT: '2026-05-01T17:00:00Z',
  PORT: 3000,
  SNAPSHOT_TTL_MS: 10_000,
  TOKEN_REFRESH_MARGIN_S: 60,
  DATA_DIR: '/tmp',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
  USE_STUB_UPSTREAM: false,
  ADMIN_PASSWORD: 'admin-pass',
  ADMIN_SESSION_SECRET: 'a'.repeat(32),
  ADMIN_SESSION_TTL_MS: 172_800_000,
  ...overrides,
});

describe('phaseFor', () => {
  const env = baseEnv();
  it('pre before start', () => expect(phaseFor(Date.parse('2026-05-01T08:00:00Z'), env)).toBe('pre'));
  it('live during', () => expect(phaseFor(Date.parse('2026-05-01T12:00:00Z'), env)).toBe('live'));
  it('ended after', () => expect(phaseFor(Date.parse('2026-05-01T18:00:00Z'), env)).toBe('ended'));
  it('inclusive at start boundary', () => expect(phaseFor(Date.parse(env.EVENT_START_AT), env)).toBe('live'));
  it('inclusive at end boundary', () => expect(phaseFor(Date.parse(env.EVENT_END_AT), env)).toBe('live'));
});

describe('rankTeams', () => {
  it('sorts by points desc, then earliest lastActivityAt, then displayName', () => {
    const accounts: Account[] = [
      { uuid: 'a', displayName: 'Zeta', points: 10, lastActivityAt: '2026-05-01T10:00:00Z' },
      { uuid: 'b', displayName: 'Alpha', points: 10, lastActivityAt: '2026-05-01T10:00:00Z' },
      { uuid: 'c', displayName: 'Beta', points: 10, lastActivityAt: '2026-05-01T09:30:00Z' },
      { uuid: 'd', displayName: 'Gamma', points: 30, lastActivityAt: null },
      { uuid: 'e', displayName: 'Delta', points: null, lastActivityAt: null },
    ];
    const ranked = rankTeams(accounts);
    expect(ranked.map((t) => t.uuid)).toEqual(['d', 'c', 'b', 'a', 'e']);
    expect(ranked[4]?.points).toBe(0);
  });

  it('returns empty array for no accounts', () => {
    expect(rankTeams([])).toEqual([]);
  });

  it('assigns sequential ranks starting at 1', () => {
    const ranked = rankTeams([
      { uuid: 'a', displayName: 'A', points: 3, lastActivityAt: null },
      { uuid: 'b', displayName: 'B', points: 2, lastActivityAt: null },
      { uuid: 'c', displayName: 'C', points: 1, lastActivityAt: null },
    ]);
    expect(ranked.map((t) => t.rank)).toEqual([1, 2, 3]);
  });

  it('falls back to displayName when points and activity tie exactly', () => {
    const ranked = rankTeams([
      { uuid: 'a', displayName: 'Zed', points: 5, lastActivityAt: '2026-05-01T10:00:00Z' },
      { uuid: 'b', displayName: 'Ada', points: 5, lastActivityAt: '2026-05-01T10:00:00Z' },
    ]);
    expect(ranked.map((t) => t.uuid)).toEqual(['b', 'a']);
  });
});

describe('LeaderboardAggregator', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tgg-'));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  const makeClient = (accounts: Account[]): ImmersiveLabClient =>
    ({
      async *walkAccounts() {
        for (const a of accounts) yield a;
      },
    }) as unknown as ImmersiveLabClient;

  it('pre-event → empty teams regardless of upstream points', async () => {
    const env = baseEnv({ DATA_DIR: tmp, EVENT_START_AT: '2099-01-01T00:00:00Z', EVENT_END_AT: '2099-01-02T00:00:00Z' });
    const agg = new LeaderboardAggregator({
      env,
      client: makeClient([{ uuid: 'x', displayName: 'X', points: 50, lastActivityAt: null }]),
    });
    await agg.init();
    const payload = await agg.getLeaderboard();
    expect(payload.phase).toBe('pre');
    expect(payload.teams).toEqual([]);
  });

  it('live → builds snapshot and persists to disk', async () => {
    const env = baseEnv({ DATA_DIR: tmp });
    const agg = new LeaderboardAggregator({
      env,
      client: makeClient([{ uuid: 'x', displayName: 'X', points: 42, lastActivityAt: null }]),
      now: () => Date.parse('2026-05-01T12:00:00Z'),
    });
    await agg.init();
    const payload = await agg.getLeaderboard();
    expect(payload.phase).toBe('live');
    expect(payload.teams[0]?.points).toBe(42);
    const onDisk = JSON.parse(await fs.readFile(path.join(tmp, 'snapshot.json'), 'utf8'));
    expect(onDisk.payload.teams[0].uuid).toBe('x');
  });

  it('single-flight: concurrent calls trigger one rebuild', async () => {
    const walk = vi.fn(async function* () {
      yield { uuid: 'x', displayName: 'X', points: 1, lastActivityAt: null } satisfies Account;
    });
    const env = baseEnv({ DATA_DIR: tmp });
    const agg = new LeaderboardAggregator({
      env,
      client: { walkAccounts: walk } as unknown as ImmersiveLabClient,
      now: () => Date.parse('2026-05-01T12:00:00Z'),
    });
    await agg.init();
    await Promise.all([agg.getLeaderboard(), agg.getLeaderboard(), agg.getLeaderboard()]);
    expect(walk).toHaveBeenCalledTimes(1);
  });

  it('serves cached snapshot within TTL without re-walking upstream', async () => {
    const walk = vi.fn(async function* () {
      yield { uuid: 'x', displayName: 'X', points: 1, lastActivityAt: null } satisfies Account;
    });
    const env = baseEnv({ DATA_DIR: tmp, SNAPSHOT_TTL_MS: 60_000 });
    let clock = Date.parse('2026-05-01T12:00:00Z');
    const agg = new LeaderboardAggregator({
      env,
      client: { walkAccounts: walk } as unknown as ImmersiveLabClient,
      now: () => clock,
    });
    await agg.init();
    await agg.getLeaderboard();
    clock += 30_000;
    await agg.getLeaderboard();
    expect(walk).toHaveBeenCalledTimes(1);
  });

  it('rebuilds once TTL expires', async () => {
    const walk = vi.fn(async function* () {
      yield { uuid: 'x', displayName: 'X', points: 1, lastActivityAt: null } satisfies Account;
    });
    const env = baseEnv({ DATA_DIR: tmp, SNAPSHOT_TTL_MS: 10_000 });
    let clock = Date.parse('2026-05-01T12:00:00Z');
    const agg = new LeaderboardAggregator({
      env,
      client: { walkAccounts: walk } as unknown as ImmersiveLabClient,
      now: () => clock,
    });
    await agg.init();
    await agg.getLeaderboard();
    clock += 15_000;
    await agg.getLeaderboard();
    expect(walk).toHaveBeenCalledTimes(2);
  });

  it('upstream error with prior snapshot → serves stale payload', async () => {
    const env = baseEnv({ DATA_DIR: tmp, SNAPSHOT_TTL_MS: 1 });
    let shouldFail = false;
    const walk = vi.fn(async function* () {
      if (shouldFail) throw new Error('upstream down');
      yield { uuid: 'x', displayName: 'X', points: 9, lastActivityAt: null } satisfies Account;
    });
    let clock = Date.parse('2026-05-01T12:00:00Z');
    const agg = new LeaderboardAggregator({
      env,
      client: { walkAccounts: walk } as unknown as ImmersiveLabClient,
      now: () => clock,
    });
    await agg.init();
    await agg.getLeaderboard();
    shouldFail = true;
    clock += 10_000;
    const stale = await agg.getLeaderboard();
    expect(stale.teams[0]?.points).toBe(9);
  });

  it('upstream error with no snapshot → throws', async () => {
    const env = baseEnv({ DATA_DIR: tmp });
    const agg = new LeaderboardAggregator({
      env,
      client: {
        async *walkAccounts() {
          throw new Error('upstream down');
        },
      } as unknown as ImmersiveLabClient,
      now: () => Date.parse('2026-05-01T12:00:00Z'),
    });
    await agg.init();
    await expect(agg.getLeaderboard()).rejects.toThrow('upstream down');
  });

  it('init loads persisted snapshot from disk', async () => {
    const env = baseEnv({ DATA_DIR: tmp });
    const first = new LeaderboardAggregator({
      env,
      client: makeClient([{ uuid: 'x', displayName: 'X', points: 11, lastActivityAt: null }]),
      now: () => Date.parse('2026-05-01T12:00:00Z'),
    });
    await first.init();
    await first.getLeaderboard();

    const walk = vi.fn(async function* () {
      yield { uuid: 'never', displayName: 'N', points: 0, lastActivityAt: null } satisfies Account;
    });
    const second = new LeaderboardAggregator({
      env,
      client: { walkAccounts: walk } as unknown as ImmersiveLabClient,
      now: () => Date.parse('2026-05-01T18:00:00Z'),
    });
    await second.init();
    const payload = await second.getLeaderboard();
    expect(payload.phase).toBe('ended');
    expect(payload.teams[0]?.points).toBe(11);
    expect(walk).not.toHaveBeenCalled();
  });

  it('snapshotAgeMs is null before first build, reflects elapsed time after', async () => {
    const env = baseEnv({ DATA_DIR: tmp });
    let clock = Date.parse('2026-05-01T12:00:00Z');
    const agg = new LeaderboardAggregator({
      env,
      client: makeClient([{ uuid: 'x', displayName: 'X', points: 1, lastActivityAt: null }]),
      now: () => clock,
    });
    await agg.init();
    expect(agg.snapshotAgeMs()).toBeNull();
    await agg.getLeaderboard();
    clock += 4_200;
    expect(agg.snapshotAgeMs()).toBe(4_200);
  });

  it('ended → serves last pre-end snapshot, skips upstream', async () => {
    const env = baseEnv({ DATA_DIR: tmp });
    const walk = vi.fn(async function* () {
      yield { uuid: 'x', displayName: 'X', points: 7, lastActivityAt: null } satisfies Account;
    });
    let clock = Date.parse('2026-05-01T12:00:00Z');
    const agg = new LeaderboardAggregator({
      env,
      client: { walkAccounts: walk } as unknown as ImmersiveLabClient,
      now: () => clock,
    });
    await agg.init();
    await agg.getLeaderboard();
    clock = Date.parse('2026-05-01T18:00:00Z');
    const frozen = await agg.getLeaderboard();
    expect(frozen.phase).toBe('ended');
    expect(frozen.teams[0]?.points).toBe(7);
    expect(walk).toHaveBeenCalledTimes(1);
  });
});
