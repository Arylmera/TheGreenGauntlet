import type { Category, Team } from '../../types';
import { CATEGORY_SCORE_FIELD } from '../../types';
import { useArcade } from '../../context/ArcadeContext';
import { PanelStep } from './PanelStep';
import { PipeStep } from './PipeStep';
import type { Rank } from './podium.constants';

type Props = {
  top: Team[];
  category?: Category;
};

function pointsOf(team: Team, category: Category): number {
  return team[CATEGORY_SCORE_FIELD[category]] as number;
}

const PODIUM_ORDER: Rank[] = [2, 1, 3];
const MIN_SCALE = 0.6;

function computeScale(rank: Rank, topPoints: number, points: number): number {
  if (rank === 1) return 1;
  if (topPoints <= 0) return rank === 2 ? 0.85 : 0.75;
  const ratio = points / topPoints;
  return Math.min(1, Math.max(MIN_SCALE, ratio));
}

function pipeRatios(pts1: number, pts2: number, pts3: number): Record<Rank, number> {
  const ratio1 = 1;
  const ratio2 = Math.max(0.78, Math.min(0.94, pts1 > 0 ? pts2 / pts1 : 0.85));
  const ratio3 = Math.max(0.72, Math.min(ratio2 - 0.04, pts1 > 0 ? pts3 / pts1 : 0.78));
  return { 1: ratio1, 2: ratio2, 3: ratio3 };
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
      <section aria-label="Top 3" className="relative z-20 -mb-14">
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
