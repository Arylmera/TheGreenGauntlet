import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonStore, ensureWritableDir } from '../snapshotStore.js';

describe('JsonStore', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tgg-ss-'));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('returns null when file missing', async () => {
    const store = new JsonStore<{ a: number }>(path.join(tmp, 'missing.json'));
    expect(await store.load()).toBeNull();
  });

  it('round-trips via atomic write', async () => {
    const file = path.join(tmp, 'x.json');
    const store = new JsonStore<{ a: number }>(file);
    await store.save({ a: 7 });
    expect(await store.load()).toEqual({ a: 7 });
    const entries = await fs.readdir(tmp);
    expect(entries).toContain('x.json');
    expect(entries).not.toContain('x.json.tmp');
  });

  it('ensureWritableDir creates and verifies write access', async () => {
    const nested = path.join(tmp, 'nested', 'deep');
    await ensureWritableDir(nested);
    const stat = await fs.stat(nested);
    expect(stat.isDirectory()).toBe(true);
  });
});
