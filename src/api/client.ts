import type { LeaderboardPayload } from '../types';
import live from '../mocks/leaderboard.live.json';
import pre from '../mocks/leaderboard.pre.json';
import ended from '../mocks/leaderboard.ended.json';

const mocks: Record<string, LeaderboardPayload> = {
  live: live as LeaderboardPayload,
  pre: pre as LeaderboardPayload,
  ended: ended as LeaderboardPayload,
};

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false';

export async function fetchLeaderboard(signal?: AbortSignal): Promise<LeaderboardPayload> {
  if (useMocks) {
    const mockName = (import.meta.env.VITE_MOCK_PHASE as string | undefined) ?? 'live';
    const payload = mocks[mockName] ?? mocks.live;
    if (!payload) throw new Error(`unknown mock: ${mockName}`);
    return simulateShuffle(payload);
  }
  const res = await fetch('/api/leaderboard', signal ? { signal } : {});
  if (!res.ok) throw new Error(`leaderboard fetch failed: ${res.status}`);
  return (await res.json()) as LeaderboardPayload;
}

function simulateShuffle(payload: LeaderboardPayload): LeaderboardPayload {
  if (payload.phase !== 'live') return payload;
  const teams = payload.teams.map((t) => ({
    ...t,
    points: t.points + Math.floor((Math.random() - 0.3) * 120),
  }));
  teams.sort((a, b) => b.points - a.points);
  return {
    ...payload,
    updatedAt: new Date().toISOString(),
    teams: teams.map((t, i) => ({ ...t, rank: i + 1 })),
  };
}
