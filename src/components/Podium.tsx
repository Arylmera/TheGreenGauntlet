import type { Team } from '../types';
import { formatRelative } from '../utils/formatRelative';
import podiumGold from '../assets/podium-gold.png';
import podiumSilver from '../assets/podium-silver.png';
import podiumBronze from '../assets/podium-bronze.png';

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

const HEIGHT: Record<Rank, string> = {
  1: 'h-40 sm:h-48 lg:h-60 2xl:h-72',
  2: 'h-32 sm:h-40 lg:h-52 2xl:h-64',
  3: 'h-32 sm:h-40 lg:h-48 2xl:h-60',
};

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
  1: 'w-14 h-14 sm:w-16 sm:h-16 lg:w-[72px] lg:h-[72px] 2xl:w-24 2xl:h-24',
  2: 'w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20',
  3: 'w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20',
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

  return (
    <section
      aria-label="Top 3"
      className="flex items-end justify-center gap-2 sm:gap-4 2xl:gap-8 mb-6 sm:mb-8 2xl:mb-10"
    >
      {PODIUM_ORDER.map((rank) => {
        const team = byRank.get(rank);
        if (!team) return null;
        return <PodiumStep key={rank} rank={rank} team={team} />;
      })}
    </section>
  );
}

type StepProps = { rank: Rank; team: Team };

function PodiumStep({ rank, team }: StepProps) {
  return (
    <article
      className={`
        flex flex-col items-center justify-end
        bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line
        px-2 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5 2xl:px-10 2xl:py-8
        ${WIDTH[rank]} ${HEIGHT[rank]} ${SHADOW[rank]}
        transition-shadow
      `}
    >
      <PodiumMedal rank={rank} />
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
        {team.points.toLocaleString('en-US')}
      </p>
      <p className="hidden sm:block mt-0.5 sm:mt-1 text-ink-mid dark:text-dark-dim text-[10px] sm:text-xs 2xl:text-sm">
        {formatRelative(team.lastActivityAt)}
      </p>
    </article>
  );
}

function PodiumMedal({ rank }: { rank: Rank }) {
  return (
    <div className="mb-2 sm:mb-3">
      <img
        src={PODIUM_IMG[rank]}
        alt={PODIUM_ALT[rank]}
        className={`${MEDAL_SIZE[rank]} object-contain`}
      />
    </div>
  );
}
