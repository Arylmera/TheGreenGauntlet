import { describe, it, expect } from 'vitest';
import { exponentialBackoff } from './backoff';

describe('exponentialBackoff', () => {
  it('returns base when attempt <= 0', () => {
    expect(exponentialBackoff(1000, 0, 60_000)).toBe(1000);
    expect(exponentialBackoff(1000, -1, 60_000)).toBe(1000);
  });

  it('doubles per attempt starting at base', () => {
    expect(exponentialBackoff(1000, 1, 1_000_000)).toBe(1000);
    expect(exponentialBackoff(1000, 2, 1_000_000)).toBe(2000);
    expect(exponentialBackoff(1000, 3, 1_000_000)).toBe(4000);
    expect(exponentialBackoff(1000, 5, 1_000_000)).toBe(16_000);
  });

  it('caps at maxMs', () => {
    expect(exponentialBackoff(1000, 20, 30_000)).toBe(30_000);
    expect(exponentialBackoff(30_000, 2, 120_000)).toBe(60_000);
    expect(exponentialBackoff(30_000, 4, 120_000)).toBe(120_000);
  });
});
