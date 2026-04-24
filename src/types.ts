export type Phase = 'pre' | 'live' | 'ended';

export type BonusCategory = 'mario' | 'crokinole' | 'helping';

/** Shape of each team on the public `/api/leaderboard` response. */
export type Team = {
  rank: number;
  uuid: string;
  displayName: string;
  /** Immersive Labs points already merged with helping bonus. */
  il_points: number;
  mario_points: number;
  crokinole_points: number;
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

/** Shape of each team on the admin `/api/admin/bonus` response. */
export type AdminBonusTeam = {
  teamId: string;
  teamName: string;
  active: boolean;
  /** Raw IL `Account.points`, before helping is merged. */
  immersivelab_points: number;
  helping_points: number;
  mario_points: number;
  crokinole_points: number;
  /** `immersivelab_points + helping_points` (matches the public column). */
  il_points: number;
  total: number;
  updated_at: string;
  updated_by: string | null;
};

export type AdminBonusListResponse = {
  updatedAt: string;
  teams: AdminBonusTeam[];
};

export type BonusBatchUpdate = {
  teamId: string;
  category: BonusCategory;
  delta: number;
};
