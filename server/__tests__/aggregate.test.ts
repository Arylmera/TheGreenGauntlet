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
  ...overrides,
});

describe('phaseFor', () => {
  const env = baseEnv();
  it('pre before start', () => expect(phaseFor(Date.parse('2026-05-01T08:00:00Z'), env)).toBe('pre'));
  it('live during', () => expect(phaseFor(Date.parse('2026-05-01T12:00:00Z'), env)).toBe('live'));
  it('ended after', () => expect(phaseFor(Date.parse('2026-05-01T18:00:00Z'), env)).toBe('ended'));
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
