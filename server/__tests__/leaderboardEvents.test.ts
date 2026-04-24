import { describe, it, expect, vi } from 'vitest';
import { LeaderboardEvents } from '../leaderboard/leaderboardEvents.js';
import type { LeaderboardPayload } from '../leaderboard/types.js';

const payload: LeaderboardPayload = {
  updatedAt: new Date().toISOString(),
  phase: 'pre',
  eventWindow: { startAt: '2026-04-24T00:00:00.000Z', endAt: '2026-04-24T23:59:59.000Z' },
  teams: [],
};

describe('LeaderboardEvents', () => {
  it('delivers emitUpdate payload to subscribers', () => {
    const bus = new LeaderboardEvents();
    const l1 = vi.fn();
    const l2 = vi.fn();
    bus.onUpdate(l1);
    bus.onUpdate(l2);

    bus.emitUpdate(payload);

    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
    expect(l1.mock.calls[0]?.[0]).toEqual(payload);
  });

  it('unsubscribe stops receiving events', () => {
    const bus = new LeaderboardEvents();
    const listener = vi.fn();
    const off = bus.onUpdate(listener);
    bus.emitUpdate(payload);
    off();
    bus.emitUpdate(payload);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('supports many concurrent listeners without warning', () => {
    const bus = new LeaderboardEvents();
    const listeners = Array.from({ length: 500 }, () => vi.fn());
    const unsubs = listeners.map((l) => bus.onUpdate(l));
    bus.emitUpdate(payload);
    for (const l of listeners) expect(l).toHaveBeenCalledTimes(1);
    unsubs.forEach((u) => u());
  });
});
