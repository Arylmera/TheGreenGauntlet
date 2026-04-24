import type { Category, Team } from '../types';
import { CATEGORY_SCORE_FIELD } from '../types';

function parseActivity(iso: string | null): number {
  return iso ? Date.parse(iso) : Number.POSITIVE_INFINITY;
}

/**
 * Return a new list of teams sorted descending by the category's points, with
 * `rank` reassigned 1..N. Tiebreaker: total desc, then earliest activity, then
 * displayName asc (matches server `rankTeams`).
 */
export function rankByCategory(teams: readonly Team[], category: Category): Team[] {
  const field = CATEGORY_SCORE_FIELD[category];
  const copy = teams.slice();
  copy.sort((a, b) => {
    const av = a[field] as number;
    const bv = b[field] as number;
    if (bv !== av) return bv - av;
    if (b.total !== a.total) return b.total - a.total;
    const aLast = parseActivity(a.lastActivityAt);
    const bLast = parseActivity(b.lastActivityAt);
    if (aLast !== bLast) return aLast - bLast;
    return a.displayName.localeCompare(b.displayName);
  });
  return copy.map((t, i) => ({ ...t, rank: i + 1 }));
}
