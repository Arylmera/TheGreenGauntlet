import type { Team } from '../../types';
import { formatRelative } from '../../utils/formatRelative';
import { MedalIcon } from '../mario/MedalIcon';
import { CoinIcon } from '../mario/CoinIcon';
import type { Rank } from './podium.constants';
import { PIPE_HEIGHT_BASE_PX, PIPE_WIDTH_PX } from './podium.constants';

type Props = { rank: Rank; team: Team; ratio: number; points: number };

export function PipeStep({ rank, team, ratio, points }: Props) {
  const w = PIPE_WIDTH_PX;
  const h = Math.round(PIPE_HEIGHT_BASE_PX * ratio);
  const isFirst = rank === 1;

  return (
    <article
      className="relative flex flex-col items-center justify-end"
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
        style={{ height: `clamp(150px, ${h}px, ${h}px)` }}
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
