import type { LeaderboardPayload } from '../types';

export async function fetchLeaderboard(signal?: AbortSignal): Promise<LeaderboardPayload> {
  const res = await fetch('/api/leaderboard', signal ? { signal } : {});
  if (!res.ok) throw new Error(`leaderboard fetch failed: ${res.status}`);
  return (await res.json()) as LeaderboardPayload;
}

export type PublicAnnouncement = {
  message: string | null;
  messageId: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export async function fetchAnnouncement(signal?: AbortSignal): Promise<PublicAnnouncement> {
  const res = await fetch('/api/announcement', signal ? { signal } : {});
  if (!res.ok) throw new Error(`announcement fetch failed: ${res.status}`);
  return (await res.json()) as PublicAnnouncement;
}
