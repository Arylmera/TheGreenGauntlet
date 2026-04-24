import type { Team } from '../types';
import { formatRelative } from '../utils/formatRelative';
import podiumGold from '../assets/podium-gold.png';
import podiumSilver from '../assets/podium-silver.png';
import podiumBronze from '../assets/podium-bronze.png';
import { useArcade } from '../context/ArcadeContext';
import { MedalIcon } from './mario/MedalIcon';
import { CoinIcon } from './mario/CoinIcon';

type Props = {
  top: Team[];
};

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

const HEIGHT_SCALED =
  'h-[calc(13rem*var(--podium-scale))] sm:h-[calc(15rem*var(--podium-scale))] lg:h-[calc(18rem*var(--podium-scale))] 2xl:h-[calc(24rem*var(--podium-scale))]';

const HEIGHT_MIN = 'min-h-44 sm:min-h-52 lg:min-h-60 2xl:min-h-80';

const MIN_SCALE = 0.6;

function computeScale(rank: Rank, topPoints: number, points: number): number {
  if (rank === 1) return 1;
  if (topPoints <= 0) return rank === 2 ? 0.85 : 0.75;
  const ratio = points / topPoints;
  return Math.min(1, Math.max(MIN_SCALE, ratio));
}

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

export function Podium({ top }: Props) {
  const byRank = new Map(top.map((t) => [t.rank as Rank, t]));
  const topPoints = byRank.get(1)?.total ?? 0;
  const { theme } = useArcade();
  const isMario = theme === 'mario';

  return (
    <section aria-label="Top 3" className="mb-6 sm:mb-8 2xl:mb-10">
      <div className="flex items-end justify-center gap-4 sm:gap-8 lg:gap-12 2xl:gap-16 relative">
        {PODIUM_ORDER.map((rank) => {
          const team = byRank.get(rank);
          if (!team) return null;
          const scale = computeScale(rank, topPoints, team.total);
          return (
            <PodiumStep
              key={rank}
              rank={rank}
              team={team}
              scale={scale}
              isMario={isMario}
            />
          );
        })}
      </div>
    </section>
  );
}

type StepProps = { rank: Rank; team: Team; scale: number; isMario: boolean };

function PodiumStep({ rank, team, scale, isMario }: StepProps) {
  const marioClasses = isMario
    ? `pipe-step ${rank === 1 ? 'mario-sparkle' : ''}`
    : '';
  return (
    <article
      style={{ ['--podium-scale' as string]: scale }}
      className={`
        relative flex flex-col items-center justify-end
        bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line
        px-2 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5 2xl:px-10 2xl:py-8
        ${WIDTH[rank]} ${HEIGHT_MIN} ${HEIGHT_SCALED} ${SHADOW[rank]}
        ${marioClasses}
        transition-[height,box-shadow] duration-300
      `}
    >
      <PodiumMedal rank={rank} isMario={isMario} />
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
      <p className={`mt-1 sm:mt-2 text-brand-green font-bold tabular inline-flex items-center gap-1 ${POINTS_TEXT[rank]}`}>
        {team.total.toLocaleString('en-US')}
        {isMario && <CoinIcon size={20} />}
      </p>
      <p className="hidden sm:block mt-0.5 sm:mt-1 text-ink-mid dark:text-dark-dim text-[10px] sm:text-xs 2xl:text-sm">
        {formatRelative(team.lastActivityAt)}
      </p>
    </article>
  );
}

function PodiumMedal({ rank, isMario }: { rank: Rank; isMario: boolean }) {
  return (
    <div className="mb-2 sm:mb-3">
      {isMario ? (
        <MedalIcon rank={rank} className={`${MEDAL_SIZE[rank]} object-contain`} />
      ) : (
        <img
          src={PODIUM_IMG[rank]}
          alt={PODIUM_ALT[rank]}
          className={`${MEDAL_SIZE[rank]} object-contain`}
        />
      )}
    </div>
  );
}
