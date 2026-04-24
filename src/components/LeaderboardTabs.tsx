import type { Category } from '../types';
import { useArcade } from '../context/ArcadeContext';

type Props = {
  value: Category;
  onChange: (next: Category) => void;
};

const TABS: { key: Category; label: string; marioLabel: string }[] = [
  { key: 'total', label: 'Total', marioLabel: 'TOTAL' },
  { key: 'immersivelab_points', label: 'Immersive Lab', marioLabel: 'IMMERSIVE LAB' },
  { key: 'mario_points', label: 'Mario', marioLabel: 'MARIO' },
  { key: 'crokinole_points', label: 'Crokinole', marioLabel: 'CROKINOLE' },
];

export function LeaderboardTabs({ value, onChange }: Props) {
  const { theme } = useArcade();
  const isMario = theme === 'mario';

  const navClasses = isMario
    ? 'flex gap-1.5 sm:gap-2 overflow-x-auto snap-x snap-mandatory max-w-full'
    : 'flex gap-1 sm:gap-2 overflow-x-auto snap-x snap-mandatory max-w-full';

  return (
    <nav aria-label="Leaderboard categories" className="min-w-0">
      <ul className={navClasses} role="tablist">
        {TABS.map((tab) => {
          const active = tab.key === value;
          return (
            <li key={tab.key} className="snap-start">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(tab.key)}
                className={buttonClass(isMario, active)}
              >
                {isMario ? tab.marioLabel : tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function buttonClass(isMario: boolean, active: boolean): string {
  if (isMario) {
    const base =
      'whitespace-nowrap font-pixel tight-px text-[9px] sm:text-[11px] px-2 sm:px-3 py-1.5 sm:py-2 border-[3px] transition-transform';
    return active
      ? `${base} bg-[color:var(--mario-parchment)] text-[color:var(--mario-ink)] border-[color:var(--mario-ink)] shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]`
      : `${base} bg-[color:var(--mario-parchment-dark)] text-[color:var(--mario-ink-soft)] border-[color:var(--mario-ink-soft)] hover:-translate-y-0.5`;
  }
  const base =
    'whitespace-nowrap text-sm sm:text-base font-semibold px-3 sm:px-4 py-2 rounded-standard border transition-colors';
  return active
    ? `${base} bg-brand-green text-white border-brand-green shadow-lvl-1`
    : `${base} bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text border-line-light dark:border-dark-line hover:bg-surface-off dark:hover:bg-dark-hover`;
}
