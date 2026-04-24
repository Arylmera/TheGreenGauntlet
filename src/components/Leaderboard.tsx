import { useRef, useState } from 'react';
import type { Team } from '../types';
import { TeamRow } from './TeamRow';
import { useArcade } from '../context/ArcadeContext';
import { CoinIcon } from './mario/CoinIcon';
import { useRowAnimations } from '../hooks/useRowAnimations';
import { useFlashedTeams } from '../hooks/useFlashedTeams';

type Props = {
  teams: Team[];
};

export function Leaderboard({ teams }: Props) {
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);
  const [query, setQuery] = useState('');
  const { theme } = useArcade();
  const isMario = theme === 'mario';

  const q = query.trim().toLowerCase();
  const visibleTeams = q
    ? teams.filter((t) => t.displayName.toLowerCase().includes(q))
    : teams;

  useRowAnimations(tbodyRef, teams);
  const flashed = useFlashedTeams(teams);

  const sectionClasses = isMario
    ? 'scroll-panel overflow-hidden'
    : 'bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line shadow-lvl-1 overflow-hidden';

  const toolbarClasses = isMario
    ? 'scroll-header px-4 pt-14 pb-3 flex items-center justify-between gap-4 flex-wrap'
    : 'px-2 sm:px-4 py-2 sm:py-3 border-b border-line-light dark:border-dark-line bg-surface-off dark:bg-dark-hover';

  const inputClasses = isMario
    ? 'pixel-input w-full sm:w-64'
    : 'w-full sm:max-w-xs px-3 py-2 rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text text-sm placeholder:text-ink-mid dark:placeholder:text-dark-dim focus:outline-none focus:ring-2 focus:ring-brand-green';

  const theadRowClasses = isMario
    ? 'text-ink-black text-left text-[10px] sm:text-xs font-pixel tight-px'
    : 'bg-surface-off dark:bg-dark-hover text-ink-black dark:text-dark-text text-left text-xs sm:text-sm 2xl:text-base font-semibold';

  return (
    <section aria-label="Leaderboard" className={sectionClasses}>
      <div className={toolbarClasses}>
        {isMario ? (
          <>
            <div className="flex items-center gap-3">
              <CoinIcon coinSize="md" spin />
              <h2
                className="font-pixel text-white text-[12px] sm:text-[14px] lg:text-[16px] tight-px"
                style={{
                  textShadow:
                    '-2px 0 #1a1a1a, 2px 0 #1a1a1a, 0 -2px #1a1a1a, 0 2px #1a1a1a, 0 3px 0 rgba(0,0,0,0.35)',
                }}
              >
                LEADERBOARD · WORLD 1-1
              </h2>
            </div>
            <label className="relative block w-full sm:w-64">
              <span className="sr-only">Search team</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search team…"
                className={inputClasses}
              />
            </label>
          </>
        ) : (
          <label className="relative block">
            <span className="sr-only">Search team</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team…"
              className={inputClasses}
            />
          </label>
        )}
      </div>
      <table className="w-full table-fixed">
        <thead>
          <tr
            className={theadRowClasses}
            style={
              isMario
                ? { background: 'var(--mario-parchment-dark)', borderBottom: '4px solid var(--mario-ink)' }
                : undefined
            }
          >
            <th className="px-2 sm:px-4 py-2 sm:py-3 w-12 sm:w-16 lg:w-20 text-center">#</th>
            <th className="hidden sm:table-cell px-2 py-3 w-14" aria-label="Team avatar" />
            <th className="px-2 sm:px-4 py-2 sm:py-3">{isMario ? 'TEAM' : 'Team'}</th>
            <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center w-44 whitespace-nowrap">
              Immersive Lab
            </th>
            <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center w-24 whitespace-nowrap">
              {isMario ? 'MARIO' : 'Mario'}
            </th>
            <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center w-32 whitespace-nowrap">
              {isMario ? 'CROKINOLE' : 'Crokinole'}
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-24 sm:w-32">
              {isMario ? 'TOTAL' : 'Total'}
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-right w-40">
              {isMario ? 'LAST ACT.' : 'Last activity'}
            </th>
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {visibleTeams.map((t) => (
            <TeamRow key={t.displayName} team={t} flashed={flashed.has(t.displayName)} />
          ))}
          {visibleTeams.length === 0 && (
            <tr>
              <td
                colSpan={8}
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
