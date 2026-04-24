import type { Category, Team } from '../types';
import { CATEGORY_SCORE_FIELD } from '../types';
import { formatRelative } from '../utils/formatRelative';
import podiumGold from '../assets/podium-gold.png';
import podiumSilver from '../assets/podium-silver.png';
import podiumBronze from '../assets/podium-bronze.png';
import { useArcade } from '../context/ArcadeContext';
import { MedalIcon } from './mario/MedalIcon';
import { CoinIcon } from './mario/CoinIcon';

type Props = {
  top: Team[];
  category?: Category;
};

function pointsOf(team: Team, category: Category): number {
  return team[CATEGORY_SCORE_FIELD[category]] as number;
}

type Rank = 1 | 2 | 3;

const PODIUM_ORDER: Rank[] = [2, 1, 3];

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

// -- non-mario (light/dark) sizing, unchanged --
const HEIGHT_SCALED =
  'h-[calc(13rem*var(--podium-scale))] sm:h-[calc(15rem*var(--podium-scale))] lg:h-[calc(18rem*var(--podium-scale))] 2xl:h-[calc(24rem*var(--podium-scale))]';
const HEIGHT_MIN = 'min-h-44 sm:min-h-52 lg:min-h-60 2xl:min-h-80';
const MIN_SCALE = 0.6;
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

function computeScale(rank: Rank, topPoints: number, points: number): number {
  if (rank === 1) return 1;
  if (topPoints <= 0) return rank === 2 ? 0.85 : 0.75;
  const ratio = points / topPoints;
  return Math.min(1, Math.max(MIN_SCALE, ratio));
}

// -- mario v2 pipe ratios: same width, height varies by point delta --
const PIPE_WIDTH_PX = 240;
const PIPE_HEIGHT_BASE_PX = 320;

function pipeRatios(pts1: number, pts2: number, pts3: number) {
  const ratio1 = 1;
  const ratio2 = Math.max(0.78, Math.min(0.94, pts1 > 0 ? pts2 / pts1 : 0.85));
  const ratio3 = Math.max(0.6, Math.min(ratio2 - 0.06, pts1 > 0 ? pts3 / pts1 : 0.72));
  return { 1: ratio1, 2: ratio2, 3: ratio3 } as Record<Rank, number>;
}

export function Podium({ top, category = 'total' }: Props) {
  const byRank = new Map(top.map((t) => [t.rank as Rank, t]));
  const first = byRank.get(1);
  const second = byRank.get(2);
  const third = byRank.get(3);
  const topPoints = first ? pointsOf(first, category) : 0;
  const { theme } = useArcade();
  const isMario = theme === 'mario';

  const ratios = pipeRatios(
    first ? pointsOf(first, category) : 0,
    second ? pointsOf(second, category) : 0,
    third ? pointsOf(third, category) : 0,
  );

  if (isMario) {
    return (
      <section
        aria-label="Top 3"
        className="relative z-20 -mb-14 pt-6 sm:pt-8 lg:pt-10"
      >
        <div className="flex items-end justify-center gap-4 sm:gap-8 lg:gap-14 relative">
          {PODIUM_ORDER.map((rank) => {
            const team = byRank.get(rank);
            if (!team) return null;
            return (
              <PipeStep
                key={rank}
                rank={rank}
                team={team}
                ratio={ratios[rank]}
                points={pointsOf(team, category)}
              />
            );
          })}
        </div>
      </section>
    );
  }

  // light/dark: existing panel layout
  return (
    <section aria-label="Top 3" className="mb-6 sm:mb-8 2xl:mb-10">
      <div className="flex items-end justify-center gap-4 sm:gap-8 lg:gap-12 2xl:gap-16 relative">
        {PODIUM_ORDER.map((rank) => {
          const team = byRank.get(rank);
          if (!team) return null;
          const points = pointsOf(team, category);
          const scale = computeScale(rank, topPoints, points);
          return <PanelStep key={rank} rank={rank} team={team} scale={scale} points={points} />;
        })}
      </div>
    </section>
  );
}

type PipeStepProps = { rank: Rank; team: Team; ratio: number; points: number };

function PipeStep({ rank, team, ratio, points }: PipeStepProps) {
  const w = PIPE_WIDTH_PX;
  const h = Math.round(PIPE_HEIGHT_BASE_PX * ratio);
  const isFirst = rank === 1;

  return (
    <article
      className={`relative flex flex-col items-center justify-end ${isFirst ? 'mario-sparkle' : ''}`}
      style={{ width: `min(${w}px, 30vw)` }}
    >
      {/* medal coin above pipe cap */}
      <div
        className="relative mb-3 shrink-0"
        style={{ width: 'clamp(64px, 108px, 108px)', aspectRatio: '1 / 1' }}
      >
        <MedalIcon rank={rank} />
      </div>

      {/* pipe shaft */}
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

function PanelStep({ rank, team, scale, points }: PanelStepProps) {
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
