import { describe, it, expect, vi } from 'vitest';
import { LeaderboardEvents } from '../leaderboardEvents.js';

describe('LeaderboardEvents', () => {
  it('delivers emitUpdate payload to subscribers', () => {
    const bus = new LeaderboardEvents();
    const l1 = vi.fn();
    const l2 = vi.fn();
    bus.onUpdate(l1);
    bus.onUpdate(l2);

    bus.emitUpdate();

    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
    const payload = l1.mock.calls[0]?.[0] as { updatedAt: string };
    expect(typeof payload.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(payload.updatedAt))).toBe(false);
  });

  it('unsubscribe stops receiving events', () => {
    const bus = new LeaderboardEvents();
    const listener = vi.fn();
    const off = bus.onUpdate(listener);
    bus.emitUpdate();
    off();
    bus.emitUpdate();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('supports many concurrent listeners without warning', () => {
    const bus = new LeaderboardEvents();
    const listeners = Array.from({ length: 500 }, () => vi.fn());
    const unsubs = listeners.map((l) => bus.onUpdate(l));
    bus.emitUpdate();
    for (const l of listeners) expect(l).toHaveBeenCalledTimes(1);
    unsubs.forEach((u) => u());
  });
});
