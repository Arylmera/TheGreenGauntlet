import { describe, expect, it } from 'vitest';
import { loadEnv } from '../env.js';

const good = {
  IMMERSIVELAB_ACCESS_KEY: 'k',
  IMMERSIVELAB_SECRET_TOKEN: 's',
  EVENT_START_AT: '2026-05-01T09:00:00Z',
  EVENT_END_AT: '2026-05-01T17:00:00Z',
  ADMIN_PASSWORD: 'admin-password',
  ADMIN_SESSION_SECRET: 'a'.repeat(32),
};

describe('loadEnv', () => {
  it('parses required + applies defaults', () => {
    const env = loadEnv(good as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3000);
    expect(env.IMMERSIVELAB_BASE_URL).toBe('https://api.immersivelabs.online');
    expect(env.SNAPSHOT_TTL_MS).toBe(10_000);
  });

  it('fails when access key missing (and stub not enabled)', () => {
    const { IMMERSIVELAB_ACCESS_KEY: _omit, ...rest } = good;
    expect(() => loadEnv(rest as NodeJS.ProcessEnv)).toThrow(/credentials required/);
  });

  it('allows empty credentials when USE_STUB_UPSTREAM=true', () => {
    const env = loadEnv({
      EVENT_START_AT: good.EVENT_START_AT,
      EVENT_END_AT: good.EVENT_END_AT,
      USE_STUB_UPSTREAM: 'true',
      ADMIN_PASSWORD: good.ADMIN_PASSWORD,
      ADMIN_SESSION_SECRET: good.ADMIN_SESSION_SECRET,
    } as NodeJS.ProcessEnv);
    expect(env.USE_STUB_UPSTREAM).toBe(true);
  });

  it('fails when ADMIN_PASSWORD missing', () => {
    const { ADMIN_PASSWORD: _omit, ...rest } = good;
    expect(() => loadEnv(rest as NodeJS.ProcessEnv)).toThrow(/ADMIN_PASSWORD/);
  });

  it('fails when ADMIN_SESSION_SECRET too short', () => {
    expect(() =>
      loadEnv({ ...good, ADMIN_SESSION_SECRET: 'short' } as NodeJS.ProcessEnv),
    ).toThrow(/ADMIN_SESSION_SECRET/);
  });

  it('fails when event window inverted', () => {
    expect(() =>
      loadEnv({
        ...good,
        EVENT_START_AT: '2026-05-01T17:00:00Z',
        EVENT_END_AT: '2026-05-01T09:00:00Z',
      } as NodeJS.ProcessEnv),
    ).toThrow(/EVENT_START_AT/);
  });

  it('fails on malformed ISO date', () => {
    expect(() => loadEnv({ ...good, EVENT_START_AT: 'not-a-date' } as NodeJS.ProcessEnv)).toThrow();
  });
});
