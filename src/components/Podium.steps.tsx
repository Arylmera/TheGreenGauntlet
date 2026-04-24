import type { Team } from '../types';
import { formatRelative } from '../utils/formatRelative';
import podiumGold from '../assets/podium-gold.png';
import podiumSilver from '../assets/podium-silver.png';
import podiumBronze from '../assets/podium-bronze.png';
import { MedalIcon } from './mario/MedalIcon';
import { CoinIcon } from './mario/CoinIcon';

export type Rank = 1 | 2 | 3;

export const PIPE_WIDTH_PX = 240;
export const PIPE_HEIGHT_BASE_PX = 320;

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
  'h-[calc(13rem*var(--podium-scale))] sm:h-[calc(15rem*var(--podium-scale))] lg:h-[calc(18rem*var(--podium-scale))] 2xl:h-[calc(24rem*var(--podium-scale))]';
const HEIGHT_MIN = 'min-h-44 sm:min-h-52 lg:min-h-60 2xl:min-h-80';
const WIDTH: Record<Rank, string> = {
  1: 'w-28 sm:w-40 lg:w-56 2xl:w-80',
  2: 'w-24 sm:w-36 lg:w-52 2xl:w-72',
  3: 'w-24 sm:w-36 lg:w-52 2xl:w-72',
};
const SHADOW: Record<Rank, string> = {
  1: 'shadow-lvl-2',
  2: 'shadow-lvl-1',
  3: 'shadow-lvl-1',
};
const MEDAL_SIZE: Record<Rank, string> = {
  1: 'w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 2xl:w-36 2xl:h-36',
  2: 'w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 2xl:w-28 2xl:h-28',
  3: 'w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 2xl:w-28 2xl:h-28',
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

type PipeStepProps = { rank: Rank; team: Team; ratio: number; points: number };

export function PipeStep({ rank, team, ratio, points }: PipeStepProps) {
  const w = PIPE_WIDTH_PX;
  const h = Math.round(PIPE_HEIGHT_BASE_PX * ratio);
  const isFirst = rank === 1;

  return (
    <article
      className={`relative flex flex-col items-center justify-end ${isFirst ? 'mario-sparkle' : ''}`}
      style={{ width: `min(${w}px, 30vw)` }}
    >
      <div
        className="relative mb-3 shrink-0"
        style={{ width: 'clamp(64px, 108px, 108px)', aspectRatio: '1 / 1' }}
      >
        <MedalIcon rank={rank} />
      </div>

      <div
        className="pipe w-full flex flex-col items-center justify-start px-3 sm:px-4 pt-6 pb-0"
        style={{ height: `clamp(180px, ${h}px, ${h}px)` }}
      >
        <div className="plaque w-full px-3 py-3 text-center relative mt-1">
          <span className="plaque-tape tight-px">RANK {rank}</span>
          <h2
            className="font-pixel text-[11px] sm:text-[13px] lg:text-[14px] text-[color:var(--mario-ink)] leading-snug break-words mt-1"
            title={team.displayName}
          >
            {team.displayName}
          </h2>
          <p className="mt-3 flex items-center justify-center gap-2">
            <span
              className="num font-bold text-[color:var(--mario-ink)]"
              style={{ fontSize: 'clamp(22px, 3vw, 36px)', lineHeight: 1 }}
            >
              {points.toLocaleString('en-US')}
            </span>
            <CoinIcon coinSize={isFirst ? 'md' : 'sm'} spin />
          </p>
          <p className="mt-2 font-crt text-[color:var(--mario-ink-soft)] text-sm sm:text-base">
            {formatRelative(team.lastActivityAt)}
          </p>
        </div>
      </div>
    </article>
  );
}

type PanelStepProps = { rank: Rank; team: Team; scale: number; points: number };

export function PanelStep({ rank, team, scale, points }: PanelStepProps) {
  return (
    <article
      style={{ ['--podium-scale' as string]: scale }}
      className={`
        relative flex flex-col items-center justify-end
        bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line
        px-2 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5 2xl:px-10 2xl:py-8
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
