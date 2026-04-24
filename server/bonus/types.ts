export const BONUS_CATEGORIES = ['mario', 'crokinole', 'helping'] as const;
export type BonusCategory = (typeof BONUS_CATEGORIES)[number];

export const CATEGORY_COLUMNS: Record<BonusCategory, string> = {
  mario: 'mario_points',
  crokinole: 'crokinole_points',
  helping: 'helping_points',
};

export function isBonusCategory(value: unknown): value is BonusCategory {
  return typeof value === 'string' && (BONUS_CATEGORIES as readonly string[]).includes(value);
}

export type TeamBonusRow = {
  team_id: string;
  team_name: string;
  mario_points: number;
  crokinole_points: number;
  helping_points: number;
  active: number;
  updated_at: string;
  updated_by: string | null;
};

export type BonusDelta = { teamId: string; category: BonusCategory; delta: number };

export type TeamSeed = { teamId: string; teamName: string };

export class BonusDbError extends Error {
  constructor(
    message: string,
    readonly code: 'NEGATIVE_TOTAL' | 'UNKNOWN_TEAM' | 'INVALID',
  ) {
    super(message);
    this.name = 'BonusDbError';
  }
}
