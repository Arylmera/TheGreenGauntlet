export type Phase = 'pre' | 'live' | 'ended';

export type Team = {
  rank: number;
  displayName: string;
  points: number;
  lastActivityAt: string | null;
};

export type LeaderboardPayload = {
  phase: Phase;
  updatedAt: string;
  eventWindow: {
    startAt: string;
    endAt: string;
  };
  teams: Team[];
};
