import { useEffect, useRef, useState } from 'react';
import type { Team } from '../types';

const FLASH_DURATION_MS = 900;

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

export function useFlashedTeams(teams: Team[]): Set<string> {
  const prevPointsRef = useRef<Map<string, number>>(new Map());
  const [flashed, setFlashed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (REDUCED_MOTION) {
      const next = new Map<string, number>();
      for (const t of teams) next.set(t.displayName, t.total);
      prevPointsRef.current = next;
      return;
    }
    const next = new Map<string, number>();
    const newlyFlashed = new Set<string>();
    for (const t of teams) {
      next.set(t.displayName, t.total);
      const prev = prevPointsRef.current.get(t.displayName);
      if (prev !== undefined && t.total > prev) newlyFlashed.add(t.displayName);
    }
    prevPointsRef.current = next;
    if (newlyFlashed.size) {
      setFlashed(newlyFlashed);
      const id = window.setTimeout(() => setFlashed(new Set()), FLASH_DURATION_MS);
      return () => window.clearTimeout(id);
    }
    return;
  }, [teams]);

  return flashed;
}
