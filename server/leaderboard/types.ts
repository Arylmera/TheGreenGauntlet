import type { Account } from '../immersivelab/schemas.js';

export type Phase = 'pre' | 'live' | 'ended';

export type Team = {
  rank: number;
  uuid: string;
  displayName: string;
  /** Raw Immersive Labs `Account.points`. Admin-only; not on the public wire. */
  immersivelab_points: number;
  /** Bonus helping points. Admin-only; not on the public wire (merged into il_points). */
  helping_points: number;
  /** Public column: `immersivelab_points + helping_points`. */
  il_points: number;
  mario_points: number;
  crokinole_points: number;
  total: number;
  lastActivityAt: string | null;
};

/** Shape emitted to the public dashboard — helping bonus scrubbed.
 *  `immersivelab_points` (raw IL without helping) is exposed so the client
 *  can sort an "Immersive Lab only" view that excludes the helping bonus.
 *  `il_points` remains `immersivelab_points + helping_points`. */
export type PublicTeam = Omit<Team, 'helping_points'>;

export type EventWindow = { startAt: string; endAt: string };

export type LeaderboardPayload = {
  updatedAt: string;
  phase: Phase;
  eventWindow: EventWindow;
  teams: PublicTeam[];
};

export type AccountSource = {
  walkAccounts(): AsyncIterable<Account>;
};
