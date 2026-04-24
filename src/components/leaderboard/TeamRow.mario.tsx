import type { Category, Team } from '../../types';
import { CATEGORY_SCORE_FIELD } from '../../types';
import { TeamAvatar } from './TeamAvatar';
import { formatRelative } from '../../utils/formatRelative';
import { CoinIcon } from '../mario/CoinIcon';

const MARIO_CELL = {
  RANK: 'px-2 sm:px-4 py-3 sm:py-4 w-12 sm:w-16 lg:w-20 text-center',
  AVATAR: 'hidden sm:table-cell px-2 py-3 sm:py-4 w-14',
  NAME: 'px-2 sm:px-4 py-3 sm:py-4 text-[color:var(--mario-ink)] font-pixel tight-px text-[11px] lg:text-[12px] truncate max-w-0',
  IL: 'hidden lg:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center num text-xl text-[color:var(--mario-ink-soft)] w-44',
  MARIO: 'hidden lg:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center num text-xl w-24',
  CROKINOLE: 'hidden lg:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center num text-xl w-32',
  TOTAL: 'px-2 sm:px-4 py-3 sm:py-4 text-center num font-bold text-2xl lg:text-3xl text-[color:var(--mario-ink)] w-24 sm:w-32',
  ACTIVITY: 'hidden md:table-cell px-4 py-4 text-right font-crt text-lg text-[color:var(--mario-ink-soft)] w-40',
} as const;

function rankTone(rank: number): '' | 'gold' | 'silver' | 'bronze' {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return '';
}

type Props = {
  team: Team;
  category: Category;
  bounce: boolean;
  flashClass: string;
  isTopThree: boolean;
};

export function MarioTeamRow({ team, category, bounce, flashClass, isTopThree }: Props) {
  const isTotal = category === 'total';
  const categoryPoints = team[CATEGORY_SCORE_FIELD[category]] as number;
  const tone = rankTone(team.rank);
  const rowBase = `scroll-row ${isTopThree ? 'top-rank' : ''}`;

  return (
    <tr className={`${rowBase} ${flashClass}`} data-key={team.displayName}>
      <td className={MARIO_CELL.RANK}>
        <span className={`rank-badge ${tone} font-pixel text-[12px] tight-px ${bounce ? 'mario-bounce' : ''}`}>
          {team.rank}
        </span>
      </td>
      <td className={MARIO_CELL.AVATAR}>
        <TeamAvatar size={36} />
      </td>
      <td className={MARIO_CELL.NAME}>
        <span title={team.displayName}>{team.displayName}</span>
      </td>
      {isTotal ? (
        <>
          <td className={MARIO_CELL.IL}>{team.il_points.toLocaleString('en-US')}</td>
          <td className={MARIO_CELL.MARIO}>
            {team.mario_points > 0 ? (
              <span className="delta">+{team.mario_points.toLocaleString('en-US')}</span>
            ) : (
              <span className="text-[color:var(--mario-ink-soft)] opacity-40">—</span>
            )}
          </td>
          <td className={MARIO_CELL.CROKINOLE}>
            {team.crokinole_points > 0 ? (
              <span className="delta">+{team.crokinole_points.toLocaleString('en-US')}</span>
            ) : (
              <span className="text-[color:var(--mario-ink-soft)] opacity-40">—</span>
            )}
          </td>
          <td className={MARIO_CELL.TOTAL}>
            <span className="inline-flex items-center gap-2 justify-end">
              {team.total.toLocaleString('en-US')}
              <CoinIcon coinSize={isTopThree ? 'md' : 'sm'} spin={isTopThree} />
            </span>
          </td>
        </>
      ) : (
        <td className={MARIO_CELL.TOTAL}>
          <span className="inline-flex items-center gap-2 justify-end">
            {categoryPoints.toLocaleString('en-US')}
            <CoinIcon coinSize={isTopThree ? 'md' : 'sm'} spin={isTopThree} />
          </span>
        </td>
      )}
      <td className={MARIO_CELL.ACTIVITY}>{formatRelative(team.lastActivityAt)}</td>
    </tr>
  );
}
