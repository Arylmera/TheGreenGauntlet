import type { Team } from '../../types';
import { formatRelative } from '../../utils/formatRelative';
import podiumBronze from '../../assets/podium-bronze.png';
import podiumGold from '../../assets/podium-gold.png';
import podiumSilver from '../../assets/podium-silver.png';
import type { Rank } from './podium.constants';

const PODIUM_IMG: Record<Rank, string> = {
  1: podiumGold,
  2: podiumSilver,
  3: podiumBronze,
};

const PODIUM_ALT: Record<Rank, string> = {
  1: 'Gold medal',
  2: 'Silver medal',
  3: 'Bronze medal',
};

const HEIGHT_SCALED =
  'h-[calc(7rem*var(--podium-scale))] sm:h-[calc(8rem*var(--podium-scale))] lg:h-[calc(8rem*var(--podium-scale))] 2xl:h-[calc(20rem*var(--podium-scale))]';
const HEIGHT_MIN: Record<Rank, string> = {
  1: 'min-h-36 sm:min-h-28 lg:min-h-28 2xl:min-h-80',
  2: 'min-h-32 sm:min-h-24 lg:min-h-24 2xl:min-h-72',
  3: 'min-h-28 sm:min-h-20 lg:min-h-20 2xl:min-h-64',
};
const WIDTH: Record<Rank, string> = {
  1: 'w-[5.5rem] sm:w-32 lg:w-44 2xl:w-72',
  2: 'w-20 sm:w-28 lg:w-40 2xl:w-64',
  3: 'w-20 sm:w-28 lg:w-40 2xl:w-64',
};
const SHADOW: Record<Rank, string> = {
  1: 'shadow-lvl-2',
  2: 'shadow-lvl-1',
  3: 'shadow-lvl-1',
};
const MEDAL_SIZE: Record<Rank, string> = {
  1: 'w-10 h-10 sm:w-14 sm:h-14 lg:w-14 lg:h-14 2xl:w-24 2xl:h-24',
  2: 'w-9 h-9 sm:w-12 sm:h-12 lg:w-12 lg:h-12 2xl:w-20 2xl:h-20',
  3: 'w-9 h-9 sm:w-12 sm:h-12 lg:w-12 lg:h-12 2xl:w-20 2xl:h-20',
};
const NAME_TEXT: Record<Rank, string> = {
  1: 'text-[13px] sm:text-base lg:text-xl 2xl:text-2xl',
  2: 'text-xs sm:text-sm lg:text-lg 2xl:text-xl',
  3: 'text-xs sm:text-sm lg:text-lg 2xl:text-xl',
};
const POINTS_TEXT: Record<Rank, string> = {
  1: 'text-sm sm:text-lg lg:text-numeric-xl',
  2: 'text-sm sm:text-base lg:text-numeric-lg',
  3: 'text-sm sm:text-base lg:text-numeric-lg',
};

type Props = { rank: Rank; team: Team; scale: number; points: number };

export function PanelStep({ rank, team, scale, points }: Props) {
  return (
    <article
      style={{ ['--podium-scale' as string]: scale }}
      className={`
        relative flex flex-col items-center
        bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line
        px-1.5 pt-2 pb-2 sm:px-3 sm:pt-3 sm:pb-3 lg:px-4 lg:pt-4 lg:pb-4 2xl:px-8 2xl:pt-6 2xl:pb-6
        ${WIDTH[rank]} ${HEIGHT_MIN[rank]} ${HEIGHT_SCALED} ${SHADOW[rank]}
        transition-[height,box-shadow] duration-300
      `}
    >
      <div className="mb-2 sm:mb-2 lg:mb-3 2xl:mb-4">
        <img
          src={PODIUM_IMG[rank]}
          alt={PODIUM_ALT[rank]}
          className={`${MEDAL_SIZE[rank]} object-contain drop-shadow-md`}
        />
      </div>
      <div className="mt-auto flex flex-col items-center w-full">
        <h2
          className={`
            ${NAME_TEXT[rank]}
            font-semibold text-ink-black dark:text-dark-text text-center
            leading-snug break-words max-w-full
          `}
          title={team.displayName}
        >
          {team.displayName}
        </h2>
        <p className={`mt-1 sm:mt-2 text-brand-green font-bold tabular ${POINTS_TEXT[rank]}`}>
          {points.toLocaleString('en-US')}
        </p>
        <p className="hidden 2xl:block mt-0.5 sm:mt-1 text-ink-mid dark:text-dark-dim text-[10px] sm:text-xs 2xl:text-sm">
          {formatRelative(team.lastActivityAt)}
        </p>
      </div>
    </article>
  );
}
