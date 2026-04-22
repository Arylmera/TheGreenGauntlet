import { describe, expect, it } from 'vitest';
import { loadEnv } from '../env.js';

const good = {
  IMMERSIVELAB_ACCESS_KEY: 'k',
  IMMERSIVELAB_SECRET_TOKEN: 's',
  EVENT_START_AT: '2026-05-01T09:00:00Z',
  EVENT_END_AT: '2026-05-01T17:00:00Z',
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
    } as NodeJS.ProcessEnv);
    expect(env.USE_STUB_UPSTREAM).toBe(true);
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
