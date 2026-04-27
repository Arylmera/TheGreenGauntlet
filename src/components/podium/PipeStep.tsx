import type { Team } from '../../types';
import { formatRelative } from '../../utils/formatRelative';
import { MedalIcon } from '../mario/MedalIcon';
import { CoinIcon } from '../mario/CoinIcon';
import type { Rank } from './podium.constants';
import { PIPE_WIDTH_PX } from './podium.constants';

type Props = { rank: Rank; team: Team; ratio: number; points: number };

export function PipeStep({ rank, team, ratio, points }: Props) {
  const w = PIPE_WIDTH_PX;
  const isFirst = rank === 1;

  return (
    <article
      className="relative flex flex-col items-center justify-end"
      style={{ width: `clamp(140px, 28vw, ${w}px)` }}
    >
      <div
        className="relative mb-1 sm:mb-2 shrink-0"
        style={{ width: 'clamp(40px, 6vw, 56px)', aspectRatio: '1 / 1' }}
      >
        <MedalIcon rank={rank} />
      </div>

      <div
        className="pipe w-full flex flex-col items-center justify-start px-3 sm:px-4 pt-3 sm:pt-6 lg:pt-8 xl:pt-12 pb-2 sm:pb-0 min-h-[calc(7rem*var(--pipe-ratio))] sm:min-h-[calc(8rem*var(--pipe-ratio))] xl:min-h-[calc(12rem*var(--pipe-ratio))] 2xl:min-h-[calc(13rem*var(--pipe-ratio))]"
        style={{ ['--pipe-ratio' as string]: ratio }}
      >
        <div className="plaque w-full px-3 py-2 text-center relative mt-1">
          <span className="plaque-tape tight-px">RANK {rank}</span>
          <h2
            className="font-pixel text-[8px] sm:text-[11px] lg:text-[12px] text-[color:var(--mario-ink)] leading-snug break-words mt-1"
            title={team.displayName}
          >
            {team.displayName}
          </h2>
          <p className="mt-1 sm:mt-2 flex items-center justify-center gap-2">
            <span
              className="num font-bold text-[color:var(--mario-ink)]"
              style={{ fontSize: 'clamp(20px, 2.2vw, 28px)', lineHeight: 1 }}
            >
              {points.toLocaleString('en-US')}
            </span>
            <CoinIcon coinSize={isFirst ? 'md' : 'sm'} spin />
          </p>
          <p className="hidden mt-1 sm:mt-2 font-crt text-[color:var(--mario-ink-soft)] text-[10px] sm:text-sm">
            {formatRelative(team.lastActivityAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
