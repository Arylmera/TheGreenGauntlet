import type { Team } from '../types';
import { TeamAvatar } from './TeamAvatar';
import { formatRelative } from '../utils/formatRelative';

type Props = {
  team: Team;
  flashed: boolean;
};

export function TeamRow({ team, flashed }: Props) {
  const topThree = team.rank <= 3;
  return (
    <tr
      className={`
        border-b border-line-light dark:border-dark-line
        bg-surface-white dark:bg-dark-card
        hover:bg-surface-panel dark:hover:bg-dark-hover
        transition-colors
        ${flashed ? 'animate-flash dark:animate-flash-dark' : ''}
      `}
      data-key={team.displayName}
    >
      <td className="px-2 sm:px-4 py-3 sm:py-4 2xl:py-5 w-12 sm:w-16 lg:w-20 text-center">
        <span className={`tabular font-bold text-base sm:text-lg 2xl:text-2xl ${topThree ? 'text-brand-green' : 'text-ink-black dark:text-dark-text'}`}>
          {team.rank}
        </span>
      </td>
      <td className="hidden sm:table-cell px-2 py-3 sm:py-4 w-14">
        <TeamAvatar size={36} />
      </td>
      <td className="px-2 sm:px-4 py-3 sm:py-4 text-ink-black dark:text-dark-text font-medium text-sm sm:text-base 2xl:text-xl truncate max-w-0">
        <span title={team.displayName}>{team.displayName}</span>
      </td>
      <td className="px-2 sm:px-4 py-3 sm:py-4 text-right tabular font-bold text-base sm:text-lg 2xl:text-2xl w-24 sm:w-32">
        <span className={topThree ? 'text-brand-green' : 'text-ink-black dark:text-dark-text'}>
          {team.points.toLocaleString('en-US')}
        </span>
      </td>
      <td className="hidden md:table-cell px-4 py-4 text-right text-ink-mid dark:text-dark-dim text-sm 2xl:text-base w-40">
        {formatRelative(team.lastActivityAt)}
      </td>
    </tr>
  );
}
