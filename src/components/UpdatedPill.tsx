import { useEffect, useState } from 'react';
import { formatRelative } from '../utils/formatRelative';
import { useArcade } from '../context/ArcadeContext';

type Props = {
  updatedAt: string | null;
};

export function UpdatedPill({ updatedAt }: Props) {
  const [, setTick] = useState(0);
  const { theme } = useArcade();
  const isMario = theme === 'mario';

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const label = updatedAt ? formatRelative(updatedAt) : 'Loading…';

  if (isMario) {
    return (
      <span className="pill-arcade" title={`Updated ${label}`}>
        <span className="live-dot" aria-hidden />
        <span>LIVE · {label}</span>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-standard bg-surface-off dark:bg-dark-card border border-line-light dark:border-dark-line text-ink-charcoal dark:text-dark-mid text-xs sm:text-sm tabular">
      <span className="w-2 h-2 rounded-full bg-brand-green" aria-hidden />
      <span className="hidden sm:inline">Updated&nbsp;</span>
      <span>{label}</span>
    </div>
  );
}
