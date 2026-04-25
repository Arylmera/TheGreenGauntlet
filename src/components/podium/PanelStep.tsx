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
  'h-[calc(12rem*var(--podium-scale))] sm:h-[calc(13rem*var(--podium-scale))] lg:h-[calc(15rem*var(--podium-scale))] 2xl:h-[calc(18rem*var(--podium-scale))]';
const HEIGHT_MIN = 'min-h-40 sm:min-h-44 lg:min-h-52 2xl:min-h-64';
const WIDTH: Record<Rank, string> = {
  1: 'w-24 sm:w-32 lg:w-44 2xl:w-56',
  2: 'w-20 sm:w-28 lg:w-40 2xl:w-52',
  3: 'w-20 sm:w-28 lg:w-40 2xl:w-52',
};
const SHADOW: Record<Rank, string> = {
  1: 'shadow-lvl-2',
  2: 'shadow-lvl-1',
  3: 'shadow-lvl-1',
};
const MEDAL_SIZE: Record<Rank, string> = {
  1: 'w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20',
  2: 'w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16',
  3: 'w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16',
};
const NAME_TEXT: Record<Rank, string> = {
  1: 'text-sm sm:text-base lg:text-xl 2xl:text-2xl',
  2: 'text-xs sm:text-sm lg:text-lg 2xl:text-xl',
  3: 'text-xs sm:text-sm lg:text-lg 2xl:text-xl',
};
const POINTS_TEXT: Record<Rank, string> = {
  1: 'text-base sm:text-lg lg:text-numeric-xl',
  2: 'text-sm sm:text-base lg:text-numeric-lg',
  3: 'text-sm sm:text-base lg:text-numeric-lg',
};

type Props = { rank: Rank; team: Team; scale: number; points: number };

export function PanelStep({ rank, team, scale, points }: Props) {
  return (
    <article
      style={{ ['--podium-scale' as string]: scale }}
      className={`
        relative flex flex-col items-center justify-end
        bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line
        px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4 2xl:px-6 2xl:py-5
        ${WIDTH[rank]} ${HEIGHT_MIN} ${HEIGHT_SCALED} ${SHADOW[rank]}
        transition-[height,box-shadow] duration-300
      `}
    >
      <div className="mb-2 sm:mb-3">
        <img
          src={PODIUM_IMG[rank]}
          alt={PODIUM_ALT[rank]}
          className={`${MEDAL_SIZE[rank]} object-contain`}
        />
      </div>
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
      <p className="hidden sm:block mt-0.5 sm:mt-1 text-ink-mid dark:text-dark-dim text-[10px] sm:text-xs 2xl:text-sm">
        {formatRelative(team.lastActivityAt)}
      </p>
    </article>
  );
}
