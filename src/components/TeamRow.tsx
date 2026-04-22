import type { Team } from '../types';
import { TeamAvatar } from './TeamAvatar';
import { formatRelative } from '../utils/formatRelative';

type Props = {
  team: Team;
  flashed: boolean;
};

const ROW_CLASS = `
  border-b border-line-light dark:border-dark-line
  bg-surface-white dark:bg-dark-card
  hover:bg-surface-panel dark:hover:bg-dark-hover
  transition-colors
`;

const FLASH_CLASS = 'animate-flash dark:animate-flash-dark';

const CELL = {
  RANK: 'px-2 sm:px-4 py-3 sm:py-4 2xl:py-5 w-12 sm:w-16 lg:w-20 text-center',
  AVATAR: 'hidden sm:table-cell px-2 py-3 sm:py-4 w-14',
  NAME: 'px-2 sm:px-4 py-3 sm:py-4 text-ink-black dark:text-dark-text font-medium text-sm sm:text-base 2xl:text-xl truncate max-w-0',
  POINTS: 'px-2 sm:px-4 py-3 sm:py-4 text-right tabular font-bold text-base sm:text-lg 2xl:text-2xl w-24 sm:w-32',
  ACTIVITY: 'hidden md:table-cell px-4 py-4 text-right text-ink-mid dark:text-dark-dim text-sm 2xl:text-base w-40',
} as const;

const NUMBER_TEXT = 'tabular font-bold text-base sm:text-lg 2xl:text-2xl';

export function TeamRow({ team, flashed }: Props) {
  const isTopThree = team.rank <= 3;
  const accent = isTopThree ? 'text-brand-green' : 'text-ink-black dark:text-dark-text';

  return (
    <tr
      className={`${ROW_CLASS} ${flashed ? FLASH_CLASS : ''}`}
      data-key={team.displayName}
    >
      <td className={CELL.RANK}>
        <span className={`${NUMBER_TEXT} ${accent}`}>{team.rank}</span>
      </td>

      <td className={CELL.AVATAR}>
        <TeamAvatar size={36} />
      </td>

      <td className={CELL.NAME}>
        <span title={team.displayName}>{team.displayName}</span>
      </td>

      <td className={CELL.POINTS}>
        <span className={accent}>{team.points.toLocaleString('en-US')}</span>
      </td>

      <td className={CELL.ACTIVITY}>
        {formatRelative(team.lastActivityAt)}
      </td>
    </tr>
  );
}
