export type Phase = 'pre' | 'live' | 'ended';

export type Team = {
  rank: number;
  uuid: string;
  displayName: string;
  points: number;
  il_points: number;
  bonus_points: number;
  total: number;
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

export type AdminBonusTeam = {
  teamId: string;
  teamName: string;
  active: boolean;
  il_points: number;
  bonus_points: number;
  total: number;
  updated_at: string;
  updated_by: string | null;
};

export type AdminBonusListResponse = {
  updatedAt: string;
  teams: AdminBonusTeam[];
};
