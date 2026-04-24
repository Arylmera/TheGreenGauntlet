import { useMemo, useRef, useState } from 'react';
import type { Category, Team } from '../../types';
import { useArcade } from '../../context/ArcadeContext';
import { useFlashedTeams } from '../../hooks/useFlashedTeams';
import { useRowAnimations } from '../../hooks/useRowAnimations';
import { LeaderboardTableHead } from './LeaderboardTableHead';
import { LeaderboardToolbar } from './LeaderboardToolbar';
import { TeamRow } from './TeamRow';

type Props = {
  teams: Team[];
  category?: Category;
  onCategoryChange?: (next: Category) => void;
};

const PANEL_ID = 'gg-leaderboard-panel';

export function Leaderboard({ teams, category = 'total', onCategoryChange }: Props) {
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);
  const [query, setQuery] = useState('');
  const { theme } = useArcade();
  const isMario = theme === 'mario';

  const visibleTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? teams.filter((t) => t.displayName.toLowerCase().includes(q)) : teams;
  }, [teams, query]);

  useRowAnimations(tbodyRef, teams);
  const flashed = useFlashedTeams(teams, category);

  const sectionCls = isMario
    ? 'scroll-panel overflow-hidden'
    : 'bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line shadow-lvl-1 overflow-hidden';

  const emptyColSpan = category === 'total' ? 8 : 5;

  return (
    <section
      id={PANEL_ID}
      role="tabpanel"
      aria-labelledby={onCategoryChange ? `gg-tab-${category}` : undefined}
      aria-label={onCategoryChange ? undefined : 'Leaderboard'}
      className={sectionCls}
    >
      <LeaderboardToolbar
        isMario={isMario}
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={onCategoryChange}
        panelId={PANEL_ID}
      />
      <table className="w-full table-fixed">
        <LeaderboardTableHead isMario={isMario} category={category} />
        <tbody ref={tbodyRef}>
          {visibleTeams.map((t) => (
            <TeamRow
              key={t.displayName}
              team={t}
              flashed={flashed.has(t.displayName)}
              category={category}
            />
          ))}
          {visibleTeams.length === 0 && (
            <tr>
              <td
                colSpan={emptyColSpan}
                className={
                  isMario
                    ? 'px-4 py-6 text-center font-crt text-lg text-[color:var(--mario-ink-soft)]'
                    : 'px-4 py-6 text-center text-ink-mid dark:text-dark-dim text-sm'
                }
              >
                No teams match “{query}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
