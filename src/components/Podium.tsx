import type { Team } from '../types';
import { TeamAvatar } from './TeamAvatar';
import { formatRelative } from '../utils/formatRelative';

type Props = {
  top: Team[];
};

const MEDAL_COLOR: Record<number, string> = {
  1: 'border-medal-gold text-medal-gold',
  2: 'border-medal-silver text-medal-silver',
  3: 'border-medal-bronze text-medal-bronze',
};

const PODIUM_ORDER: number[] = [2, 1, 3];

const HEIGHT: Record<number, string> = {
  1: 'h-36 sm:h-44 lg:h-56 2xl:h-72',
  2: 'h-28 sm:h-36 lg:h-44 2xl:h-56',
  3: 'h-24 sm:h-32 lg:h-36 2xl:h-48',
};

const WIDTH: Record<number, string> = {
  1: 'w-28 sm:w-40 lg:w-56 2xl:w-80',
  2: 'w-24 sm:w-36 lg:w-52 2xl:w-72',
  3: 'w-24 sm:w-36 lg:w-52 2xl:w-72',
};

const SHADOW: Record<number, string> = {
  1: 'shadow-lvl-2',
  2: 'shadow-lvl-1',
  3: 'shadow-lvl-1',
};

export function Podium({ top }: Props) {
  const byRank = new Map(top.map((t) => [t.rank, t]));

  return (
    <section aria-label="Top 3" className="flex items-end justify-center gap-2 sm:gap-4 2xl:gap-8 mb-6 sm:mb-8 2xl:mb-10">
      {PODIUM_ORDER.map((rank) => {
        const team = byRank.get(rank);
        if (!team) return null;
        const avatarSize = rank === 1 ? 56 : 44;
        return (
          <article
            key={rank}
            className={`
              flex flex-col items-center justify-end
              bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line
              px-2 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5 2xl:px-10 2xl:py-8
              ${WIDTH[rank]}
              ${HEIGHT[rank]}
              ${SHADOW[rank]}
              transition-shadow
            `}
          >
            <div className="relative mb-2 sm:mb-3">
              <TeamAvatar size={avatarSize} className={rank === 1 ? 'sm:!w-16 sm:!h-16 lg:!w-[72px] lg:!h-[72px] 2xl:!w-24 2xl:!h-24' : 'sm:!w-14 sm:!h-14 lg:!w-16 lg:!h-16 2xl:!w-20 2xl:!h-20'} />
              <span
                className={`
                  absolute -bottom-1 -right-1
                  w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10
                  rounded-full bg-surface-white dark:bg-dark-card
                  border-2 ${MEDAL_COLOR[rank]}
                  flex items-center justify-center
                  text-xs sm:text-sm lg:text-base 2xl:text-lg font-bold tabular
                  shadow-lvl-1
                `}
                aria-label={`Rank ${rank}`}
              >
                {rank}
              </span>
            </div>
            <h2
              className={`
                ${rank === 1 ? 'text-sm sm:text-base lg:text-xl 2xl:text-2xl' : 'text-xs sm:text-sm lg:text-lg 2xl:text-xl'}
                font-semibold text-ink-black dark:text-dark-text text-center
                leading-tight truncate max-w-full
              `}
              title={team.displayName}
            >
              {team.displayName}
            </h2>
            <p className={`mt-1 sm:mt-2 text-brand-green font-bold tabular ${rank === 1 ? 'text-base sm:text-lg lg:text-numeric-xl' : 'text-sm sm:text-base lg:text-numeric-lg'}`}>
              {team.points.toLocaleString('en-US')}
            </p>
            <p className="hidden sm:block mt-0.5 sm:mt-1 text-ink-mid dark:text-dark-dim text-[10px] sm:text-xs 2xl:text-sm">
              {formatRelative(team.lastActivityAt)}
            </p>
          </article>
        );
      })}
    </section>
  );
}
