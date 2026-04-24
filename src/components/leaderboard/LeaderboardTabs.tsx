import { useRef } from 'react';
import type { Category } from '../../types';
import { useArcade } from '../../context/ArcadeContext';

type Props = {
  value: Category;
  onChange: (next: Category) => void;
  /** Optional id of the element the tabs control (for aria-controls). */
  panelId?: string;
};

const TABS: { key: Category; label: string; marioLabel: string }[] = [
  { key: 'total', label: 'Total', marioLabel: 'TOTAL' },
  { key: 'immersivelab_points', label: 'Immersive Lab', marioLabel: 'IMMERSIVE LAB' },
  { key: 'mario_points', label: 'Mario', marioLabel: 'MARIO' },
  { key: 'crokinole_points', label: 'Crokinole', marioLabel: 'CROKINOLE' },
];

function tabId(key: Category): string {
  return `gg-tab-${key}`;
}

export function LeaderboardTabs({ value, onChange, panelId }: Props) {
  const { theme } = useArcade();
  const isMario = theme === 'mario';
  const listRef = useRef<HTMLUListElement | null>(null);

  const navClasses = isMario
    ? 'flex gap-1.5 sm:gap-2 overflow-x-auto snap-x snap-mandatory max-w-full'
    : 'flex gap-1 sm:gap-2 overflow-x-auto snap-x snap-mandatory max-w-full';

  function handleKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    e.preventDefault();
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]') ?? [],
    );
    if (buttons.length === 0) return;
    const currentIndex = buttons.findIndex((b) => b === document.activeElement);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % buttons.length;
    else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = buttons.length - 1;
    buttons[nextIndex]?.focus();
  }

  return (
    <ul
      ref={listRef}
      className={navClasses}
      role="tablist"
      aria-label="Leaderboard categories"
      onKeyDown={handleKeyDown}
    >
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <li key={tab.key} className="snap-start">
            <button
              id={tabId(tab.key)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.key)}
              className={buttonClass(isMario, active)}
            >
              {isMario ? tab.marioLabel : tab.label}
            </button>
          </li>
        );
      })}
    </ul>
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
