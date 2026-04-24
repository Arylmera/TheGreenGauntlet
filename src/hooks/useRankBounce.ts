import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

export function useRankBounce(rank: number, enabled: boolean, onBounce: () => void): boolean {
  const [bounce, setBounce] = useState(false);
  const prevRank = useRef<number | null>(null);

  useEffect(() => {
    if (
      prevRank.current !== null &&
      prevRank.current !== rank &&
      enabled &&
      !prefersReducedMotion()
    ) {
      setBounce(true);
      onBounce();
      const t = window.setTimeout(() => setBounce(false), 500);
      return () => window.clearTimeout(t);
    }
    prevRank.current = rank;
  }, [rank, enabled, onBounce]);

  return bounce;
}
