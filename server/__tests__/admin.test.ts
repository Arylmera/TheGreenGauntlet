import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { LeaderboardAggregator } from '../leaderboard/aggregator.js';
import { BonusDb } from '../bonus/bonusDb.js';
import { LeaderboardEvents } from '../leaderboard/leaderboardEvents.js';
import type { Account } from '../immersivelab/schemas.js';
import type { ImmersiveLabClient } from '../immersivelab/client.js';
import type { Env } from '../env.js';

const PASSWORD = 'super-secret';
const SECRET = 'a'.repeat(32);

const baseEnv = (dir: string, overrides: Partial<Env> = {}): Env => ({
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
  ADMIN_PASSWORD: PASSWORD,
  ADMIN_SESSION_SECRET: SECRET,
  ADMIN_SESSION_TTL_MS: 172_800_000,
  ...overrides,
});

const fakeClient = (accounts: Account[]): ImmersiveLabClient =>
  ({
    async *walkAccounts() {
      for (const a of accounts) yield a;
    },
  }) as unknown as ImmersiveLabClient;

const accounts: Account[] = [
  { uuid: 't1', displayName: 'Team One', points: 100, lastActivityAt: null },
  { uuid: 't2', displayName: 'Team Two', points: 200, lastActivityAt: null },
];

async function makeHarness(tmp: string) {
  const env = baseEnv(tmp);
  const client = fakeClient(accounts);
  const bonusDb = new BonusDb(path.join(tmp, 'bonus.sqlite'));
  const events = new LeaderboardEvents();
  const aggregator = new LeaderboardAggregator({
    env,
    client,
    now: () => Date.parse('2026-05-01T12:00:00Z'),
    bonusDb,
    events,
  });
  await aggregator.init();
  const app = await buildApp({ env, client, aggregator, bonusDb, events });
  return { app, bonusDb, aggregator, events };
}

async function login(app: Awaited<ReturnType<typeof makeHarness>>['app'], password = PASSWORD) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/admin/login',
    payload: { password },
  });
  const setCookie = res.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const cookie = cookieHeader?.split(';')[0] ?? '';
  return { res, cookie };
}

describe('admin routes', () => {
  let tmp: string;
  let harness: Awaited<ReturnType<typeof makeHarness>>;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tgg-adm-'));
    harness = await makeHarness(tmp);
  });
  afterEach(async () => {
    await harness.app.close();
    harness.bonusDb.close();
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('POST /api/admin/login with correct password sets cookie', async () => {
    const { res, cookie } = await login(harness.app);
    expect(res.statusCode).toBe(200);
    expect(cookie).toMatch(/^gg_admin=/);
  });

  it('POST /api/admin/login with wrong password → 401', async () => {
    const res = await harness.app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'nope' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('unauthenticated /api/admin/bonus → 401', async () => {
    const res = await harness.app.inject({ method: 'GET', url: '/api/admin/bonus' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/admin/bonus returns list with per-category breakdown', async () => {
    await harness.aggregator.getLeaderboard();
    const { cookie } = await login(harness.app);
    const res = await harness.app.inject({
      method: 'GET',
      url: '/api/admin/bonus',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.teams).toHaveLength(2);
    const t1 = body.teams.find((t: { teamId: string }) => t.teamId === 't1');
    expect(t1.immersivelab_points).toBe(100);
    expect(t1.helping_points).toBe(0);
    expect(t1.mario_points).toBe(0);
    expect(t1.crokinole_points).toBe(0);
    expect(t1.il_points).toBe(100);
    expect(t1.total).toBe(100);
    expect(t1.active).toBe(true);
  });

  it('POST /api/admin/bonus/batch applies deltas and invalidates cache', async () => {
    await harness.aggregator.getLeaderboard();
    const { cookie } = await login(harness.app);

    const res = await harness.app.inject({
      method: 'POST',
      url: '/api/admin/bonus/batch',
      headers: { cookie, 'content-type': 'application/json' },
      payload: {
        updates: [
          { teamId: 't1', category: 'mario', delta: 30 },
          { teamId: 't1', category: 'helping', delta: 20 },
          { teamId: 't2', category: 'crokinole', delta: 25 },
        ],
      },
    });
    expect(res.statusCode).toBe(200);

    const after = await harness.app.inject({
      method: 'GET',
      url: '/api/leaderboard',
    });
    const teams = after.json().teams as {
      uuid: string;
      il_points: number;
      mario_points: number;
      crokinole_points: number;
      total: number;
    }[];
    const t1 = teams.find((t) => t.uuid === 't1');
    const t2 = teams.find((t) => t.uuid === 't2');
    // t1: IL 100 + helping 20 = 120 il_points; +mario 30 = 150 total.
    expect(t1?.il_points).toBe(120);
    expect(t1?.mario_points).toBe(30);
    expect(t1?.total).toBe(150);
    // t2: IL 200 il_points; +crokinole 25 = 225 total.
    expect(t2?.il_points).toBe(200);
    expect(t2?.crokinole_points).toBe(25);
    expect(t2?.total).toBe(225);
    expect(teams[0]?.uuid).toBe('t2');
  });

  it('batch rejects invalid category with 400', async () => {
    await harness.aggregator.getLeaderboard();
    const { cookie } = await login(harness.app);
    const res = await harness.app.inject({
      method: 'POST',
      url: '/api/admin/bonus/batch',
      headers: { cookie, 'content-type': 'application/json' },
      payload: { updates: [{ teamId: 't1', category: 'nope', delta: 5 }] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('batch rejects whole batch if any category result < 0', async () => {
    await harness.aggregator.getLeaderboard();
    const { cookie } = await login(harness.app);
    await harness.app.inject({
      method: 'POST',
      url: '/api/admin/bonus/batch',
      headers: { cookie, 'content-type': 'application/json' },
      payload: { updates: [{ teamId: 't1', category: 'mario', delta: 10 }] },
    });
    const res = await harness.app.inject({
      method: 'POST',
      url: '/api/admin/bonus/batch',
      headers: { cookie, 'content-type': 'application/json' },
      payload: {
        updates: [
          { teamId: 't1', category: 'mario', delta: -20 },
          { teamId: 't2', category: 'crokinole', delta: 5 },
        ],
      },
    });
    expect(res.statusCode).toBe(409);
    const list = await harness.app.inject({
      method: 'GET',
      url: '/api/admin/bonus',
      headers: { cookie },
    });
    const teams = list.json().teams as {
      teamId: string;
      mario_points: number;
      crokinole_points: number;
    }[];
    expect(teams.find((t) => t.teamId === 't1')?.mario_points).toBe(10);
    expect(teams.find((t) => t.teamId === 't2')?.crokinole_points).toBe(0);
  });

  it('PATCH active=false excludes team from public leaderboard', async () => {
    await harness.aggregator.getLeaderboard();
    const { cookie } = await login(harness.app);
    const res = await harness.app.inject({
      method: 'PATCH',
      url: '/api/admin/bonus/t1/active',
      headers: { cookie, 'content-type': 'application/json' },
      payload: { active: false },
    });
    expect(res.statusCode).toBe(200);

    const after = await harness.app.inject({ method: 'GET', url: '/api/leaderboard' });
    const teams = after.json().teams as { uuid: string }[];
    expect(teams.map((t) => t.uuid)).toEqual(['t2']);
  });

  it('GET /api/admin/export.csv returns CSV with standings', async () => {
    await harness.aggregator.getLeaderboard();
    const { cookie } = await login(harness.app);
    await harness.app.inject({
      method: 'POST',
      url: '/api/admin/bonus/batch',
      headers: { cookie, 'content-type': 'application/json' },
      payload: {
        updates: [
          { teamId: 't1', category: 'mario', delta: 120 },
          { teamId: 't1', category: 'helping', delta: 80 },
        ],
      },
    });
    const res = await harness.app.inject({
      method: 'GET',
      url: '/api/admin/export.csv',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    const body = res.body;
    expect(body).toMatch(
      /^team_id,team_name,immersivelab_points,helping_points,mario_points,crokinole_points,total,rank/,
    );
    // t1 total = 100 (IL) + 80 (helping) + 120 (mario) = 300, ranks #1 over t2 (200).
    const lines = body.trim().split('\n');
    expect(lines[1]).toMatch(/t1,Team One,100,80,120,0,300,1/);
  });

  it('login rate-limiter returns 429 after 20 failed attempts in window', async () => {
    for (let i = 0; i < 20; i += 1) {
      const r = await harness.app.inject({
        method: 'POST',
        url: '/api/admin/login',
        payload: { password: 'wrong' },
      });
      expect(r.statusCode).toBe(401);
    }
    const blocked = await harness.app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'wrong' },
    });
    expect(blocked.statusCode).toBe(429);
    // Correct password also blocked while limit exceeded.
    const stillBlocked = await harness.app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: PASSWORD },
    });
    expect(stillBlocked.statusCode).toBe(429);
  });

  it('logout clears cookie and subsequent request is 401', async () => {
    const { cookie } = await login(harness.app);
    const logout = await harness.app.inject({
      method: 'POST',
      url: '/api/admin/logout',
      headers: { cookie },
    });
    expect(logout.statusCode).toBe(200);
    const setCookie = logout.headers['set-cookie'];
    const clearHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(clearHeader).toMatch(/Max-Age=0/);
  });
});

describe('aggregator + bonus integration', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tgg-int-'));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('seeds teams from IL walkthrough on rebuild', async () => {
    const env = baseEnv(tmp);
    const bonusDb = new BonusDb(path.join(tmp, 'bonus.sqlite'));
    const aggregator = new LeaderboardAggregator({
      env,
      client: fakeClient(accounts),
      now: () => Date.parse('2026-05-01T12:00:00Z'),
      bonusDb,
    });
    await aggregator.init();
    await aggregator.getLeaderboard();
    const rows = bonusDb.getAll();
    expect(rows.map((r) => r.team_id).sort()).toEqual(['t1', 't2']);
    bonusDb.close();
  });

  it('invalidate() drops cached snapshot; next call re-merges bonus', async () => {
    const env = baseEnv(tmp, { SNAPSHOT_TTL_MS: 60_000 });
    const bonusDb = new BonusDb(path.join(tmp, 'bonus.sqlite'));
    const aggregator = new LeaderboardAggregator({
      env,
      client: fakeClient(accounts),
      now: () => Date.parse('2026-05-01T12:00:00Z'),
      bonusDb,
    });
    await aggregator.init();
    const first = await aggregator.getLeaderboard();
    expect(first.teams[0]?.total).toBe(200); // t2 wins w/ 200
    bonusDb.applyBatchDeltas(
      [{ teamId: 't1', category: 'mario', delta: 500 }],
      'admin',
    );
    aggregator.invalidate();
    const second = await aggregator.getLeaderboard();
    expect(second.teams[0]?.uuid).toBe('t1');
    expect(second.teams[0]?.total).toBe(600);
    bonusDb.close();
  });
});
