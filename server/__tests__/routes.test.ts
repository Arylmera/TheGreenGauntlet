import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { LeaderboardAggregator } from '../aggregate.js';
import type { Account, ImmersiveLabClient } from '../immersiveLab.js';
import type { Env } from '../env.js';

const env = (dir: string, overrides: Partial<Env> = {}): Env => ({
  IMMERSIVELAB_ACCESS_KEY: 'k',
  IMMERSIVELAB_SECRET_TOKEN: 's',
  IMMERSIVELAB_BASE_URL: 'https://example.test',
  EVENT_START_AT: '2026-05-01T09:00:00Z',
  EVENT_END_AT: '2026-05-01T17:00:00Z',
  PORT: 3000,
  SNAPSHOT_TTL_MS: 10_000,
  TOKEN_REFRESH_MARGIN_S: 60,
  DATA_DIR: dir,
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
  USE_STUB_UPSTREAM: false,
  ADMIN_PASSWORD: 'admin-pass',
  ADMIN_SESSION_SECRET: 'a'.repeat(32),
  ADMIN_SESSION_TTL_MS: 172_800_000,
  ...overrides,
});

const fakeClient = (accounts: Account[]): ImmersiveLabClient =>
  ({
    async *walkAccounts() {
      for (const a of accounts) yield a;
    },
  }) as unknown as ImmersiveLabClient;

describe('routes', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tgg-rt-'));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('GET /api/health returns phase + window', async () => {
    const e = env(tmp);
    const client = fakeClient([]);
    const aggregator = new LeaderboardAggregator({ env: e, client });
    await aggregator.init();
    const app = await buildApp({ env: e, client, aggregator });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.eventWindow.startAt).toBe(e.EVENT_START_AT);
    expect(['pre', 'live', 'ended']).toContain(body.eventWindow.phase);
    await app.close();
  });

  it('GET /api/leaderboard returns ranked teams and scrubs email', async () => {
    const e = env(tmp);
    const client = fakeClient([
      { uuid: 'a', displayName: 'A', email: 'a@x', points: 10, lastActivityAt: null },
      { uuid: 'b', displayName: 'B', email: 'b@x', points: 20, lastActivityAt: null },
    ]);
    const aggregator = new LeaderboardAggregator({
      env: e,
      client,
      now: () => Date.parse('2026-05-01T12:00:00Z'),
    });
    await aggregator.init();
    const app = await buildApp({ env: e, client, aggregator });
    const res = await app.inject({ method: 'GET', url: '/api/leaderboard' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.teams.map((t: { uuid: string }) => t.uuid)).toEqual(['b', 'a']);
    expect(body.teams[0]).not.toHaveProperty('email');
    await app.close();
  });

  it('unknown /api/* → 404', async () => {
    const e = env(tmp);
    const client = fakeClient([]);
    const aggregator = new LeaderboardAggregator({ env: e, client });
    await aggregator.init();
    const app = await buildApp({ env: e, client, aggregator });
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
