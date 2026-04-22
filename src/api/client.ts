import type { LeaderboardPayload } from '../types';

export async function fetchLeaderboard(signal?: AbortSignal): Promise<LeaderboardPayload> {
  const res = await fetch('/api/leaderboard', signal ? { signal } : {});
  if (!res.ok) throw new Error(`leaderboard fetch failed: ${res.status}`);
  return (await res.json()) as LeaderboardPayload;
}
