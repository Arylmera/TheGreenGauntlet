import { useEffect, useRef, useState } from 'react';
import type { Category, Team } from '../types';
import { CATEGORY_SCORE_FIELD } from '../types';
import { TeamAvatar } from './TeamAvatar';
import { formatRelative } from '../utils/formatRelative';
import { useArcade } from '../context/ArcadeContext';
import { MarioTeamRow } from './TeamRow.mario';

type Props = {
  team: Team;
  flashed: boolean;
  category?: Category;
};

const ROW_CLASS = `
  border-b border-line-light dark:border-dark-line
  bg-surface-white dark:bg-dark-card
  hover:bg-surface-panel dark:hover:bg-dark-hover
  transition-colors
`;

const FLASH_CLASS = 'animate-flash dark:animate-flash-dark';
const FLASH_MARIO = 'animate-flash-mario';

const CELL = {
  RANK: 'px-2 sm:px-4 py-3 sm:py-4 2xl:py-5 w-12 sm:w-16 lg:w-20 text-center',
  AVATAR: 'hidden sm:table-cell px-2 py-3 sm:py-4 w-14',
  NAME: 'px-2 sm:px-4 py-3 sm:py-4 text-ink-black dark:text-dark-text font-medium text-sm sm:text-base 2xl:text-xl truncate max-w-0',
  IL: 'hidden lg:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center tabular text-sm 2xl:text-base text-ink-mid dark:text-dark-dim w-44',
  MARIO: 'hidden lg:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center tabular text-sm 2xl:text-base text-ink-mid dark:text-dark-dim w-24',
  CROKINOLE: 'hidden lg:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center tabular text-sm 2xl:text-base text-ink-mid dark:text-dark-dim w-32',
  TOTAL: 'px-2 sm:px-4 py-3 sm:py-4 text-center tabular font-bold text-base sm:text-lg 2xl:text-2xl w-24 sm:w-32',
  ACTIVITY: 'hidden md:table-cell px-4 py-4 text-right text-ink-mid dark:text-dark-dim text-sm 2xl:text-base w-40',
} as const;

const NUMBER_TEXT = 'tabular font-bold text-base sm:text-lg 2xl:text-2xl inline-block';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function TeamRow({ team, flashed, category = 'total' }: Props) {
  const isTopThree = team.rank <= 3;
  const accent = isTopThree ? 'text-brand-green' : 'text-ink-black dark:text-dark-text';
  const { theme, playCoin, playBounce } = useArcade();
  const isMario = theme === 'mario';
  const isTotal = category === 'total';
  const categoryPoints = team[CATEGORY_SCORE_FIELD[category]] as number;

  const [bounce, setBounce] = useState(false);
  const prevRank = useRef<number | null>(null);

  useEffect(() => {
    if (prevRank.current !== null && prevRank.current !== team.rank && isMario && !prefersReducedMotion()) {
      setBounce(true);
      playBounce();
      const t = window.setTimeout(() => setBounce(false), 500);
      return () => window.clearTimeout(t);
    }
    prevRank.current = team.rank;
  }, [team.rank, isMario, playBounce]);

  useEffect(() => {
    if (flashed && isMario) playCoin();
  }, [flashed, isMario, playCoin]);

  const flashClass = flashed ? (isMario ? FLASH_MARIO : FLASH_CLASS) : '';

  if (isMario) {
    return (
      <MarioTeamRow
        team={team}
        category={category}
        bounce={bounce}
        flashClass={flashClass}
        isTopThree={isTopThree}
      />
    );
  }

  return (
    <tr className={`${ROW_CLASS} ${flashClass}`} data-key={team.displayName}>
      <td className={CELL.RANK}>
        <span className={`${NUMBER_TEXT} ${accent}`}>{team.rank}</span>
      </td>
      <td className={CELL.AVATAR}>
        <TeamAvatar size={36} />
      </td>
      <td className={CELL.NAME}>
        <span title={team.displayName}>{team.displayName}</span>
      </td>
      {isTotal ? (
        <>
          <td className={CELL.IL}>{team.il_points.toLocaleString('en-US')}</td>
          <td className={CELL.MARIO}>
            {team.mario_points > 0 ? (
              <span className="text-brand-green font-medium">
                +{team.mario_points.toLocaleString('en-US')}
              </span>
            ) : (
              <span>—</span>
            )}
          </td>
          <td className={CELL.CROKINOLE}>
            {team.crokinole_points > 0 ? (
              <span className="text-brand-green font-medium">
                +{team.crokinole_points.toLocaleString('en-US')}
              </span>
            ) : (
              <span>—</span>
            )}
          </td>
          <td className={CELL.TOTAL}>
            <span className={`${accent} inline-flex items-center gap-1 justify-end`}>
              {team.total.toLocaleString('en-US')}
            </span>
          </td>
        </>
      ) : (
        <td className={CELL.TOTAL}>
          <span className={`${accent} inline-flex items-center gap-1 justify-end`}>
            {categoryPoints.toLocaleString('en-US')}
          </span>
        </td>
      )}
      <td className={CELL.ACTIVITY}>{formatRelative(team.lastActivityAt)}</td>
    </tr>
  );
}
