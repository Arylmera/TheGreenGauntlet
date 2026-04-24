import { useEffect, useRef, useState } from 'react';
import type { Category, Team } from '../types';
import { CATEGORY_SCORE_FIELD } from '../types';

const FLASH_DURATION_MS = 900;

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/**
 * Flash teams whose score for the active category went up since the last render.
 * On manual category switch the baseline is reset without flashing — only live
 * upstream updates trigger the animation.
 */
export function useFlashedTeams(teams: Team[], category: Category = 'total'): Set<string> {
  const prevPointsRef = useRef<Map<string, number>>(new Map());
  const prevCategoryRef = useRef<Category>(category);
  const [flashed, setFlashed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const field = CATEGORY_SCORE_FIELD[category];
    const next = new Map<string, number>();
    for (const t of teams) next.set(t.displayName, t[field] as number);

    const categoryChanged = prevCategoryRef.current !== category;
    prevCategoryRef.current = category;

    if (REDUCED_MOTION || categoryChanged) {
      prevPointsRef.current = next;
      return;
    }

    const newlyFlashed = new Set<string>();
    for (const [name, score] of next) {
      const prev = prevPointsRef.current.get(name);
      if (prev !== undefined && score > prev) newlyFlashed.add(name);
    }
    prevPointsRef.current = next;
    if (newlyFlashed.size) {
      setFlashed(newlyFlashed);
      const id = window.setTimeout(() => setFlashed(new Set()), FLASH_DURATION_MS);
      return () => window.clearTimeout(id);
    }
    return;
  }, [teams, category]);

  return flashed;
}
