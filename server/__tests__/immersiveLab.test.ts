import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImmersiveLabClient } from '../immersivelab/client.js';
import type { Env } from '../env.js';

const baseEnv = (dir: string): Env => ({
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
});

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('ImmersiveLabClient', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tgg-il-'));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('exchanges credentials for a token then persists it', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/v1/public/tokens')) return jsonRes({ accessToken: 'T', expiresIn: 3600 });
      return jsonRes({ page: [], meta: { hasNextPage: false } });
    }) as unknown as typeof fetch;

    const env = baseEnv(tmp);
    const client = new ImmersiveLabClient({ env, fetchImpl, now: () => 1_000_000 });
    await client.init();
    const token = await client.getToken();
    expect(token).toBe('T');
    const onDisk = JSON.parse(await fs.readFile(path.join(tmp, 'token.json'), 'utf8'));
    expect(onDisk.accessToken).toBe('T');
    expect(onDisk.expiresAt).toBe(1_000_000 + 3600 * 1000);
  });

  it('reuses cached token before expiry, refreshes after', async () => {
    const calls: string[] = [];
    let clock = 1_000_000;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      calls.push(url);
      if (url.endsWith('/v1/public/tokens')) {
        return jsonRes({ accessToken: `T-${calls.filter((c) => c.endsWith('/v1/public/tokens')).length}`, expiresIn: 200 });
      }
      return jsonRes({ page: [] });
    }) as unknown as typeof fetch;

    const env = baseEnv(tmp);
    const client = new ImmersiveLabClient({ env, fetchImpl, now: () => clock });
    await client.init();
    expect(await client.getToken()).toBe('T-1');
    expect(await client.getToken()).toBe('T-1');
    clock += 180_000;
    expect(await client.getToken()).toBe('T-2');
    expect(calls.filter((c) => c.endsWith('/v1/public/tokens'))).toHaveLength(2);
  });

  it('walkAccounts paginates list then fetches detail per account', async () => {
    let listCall = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/v1/public/tokens')) return jsonRes({ accessToken: 'T', expiresIn: 3600 });
      if (/\/v2\/accounts\/[^?]+$/.test(url)) {
        const id = url.split('/').pop() as string;
        return jsonRes({
          uuid: id,
          displayName: id.toUpperCase(),
          points: id === 'a' ? 1 : 2,
          lastActivityAt: '2026-05-01T10:00:00Z',
          email: id === 'a' ? 'a@immersivelabs.pro' : 'b@immersivelabs.pro',
        });
      }
      listCall++;
      if (listCall === 1) {
        return jsonRes({
          page: [{ uuid: 'a', email: 'a@immersivelabs.pro', points: 1 }],
          meta: { hasNextPage: true, nextPageToken: 'p2' },
        });
      }
      return jsonRes({
        page: [{ uuid: 'b', email: 'b@immersivelabs.pro', points: 2 }],
        meta: { hasNextPage: false },
      });
    }) as unknown as typeof fetch;

    const client = new ImmersiveLabClient({ env: baseEnv(tmp), fetchImpl });
    await client.init();
    const out = [];
    for await (const a of client.walkAccounts()) out.push(a);
    expect(out.map((a) => a.uuid)).toEqual(['a', 'b']);
    expect(out.map((a) => a.displayName)).toEqual(['A', 'B']);
  });

  it('retries once on 401 after refreshing token', async () => {
    let tokenCalls = 0;
    let accountsCalls = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/v1/public/tokens')) {
        tokenCalls++;
        return jsonRes({ accessToken: `T-${tokenCalls}`, expiresIn: 3600 });
      }
      accountsCalls++;
      if (accountsCalls === 1) return new Response('', { status: 401 });
      return jsonRes({ page: [], meta: { hasNextPage: false } });
    }) as unknown as typeof fetch;

    const client = new ImmersiveLabClient({ env: baseEnv(tmp), fetchImpl });
    await client.init();
    const out = [];
    for await (const a of client.walkAccounts()) out.push(a);
    expect(out).toEqual([]);
    expect(tokenCalls).toBe(2);
    expect(accountsCalls).toBe(2);
  });
});
