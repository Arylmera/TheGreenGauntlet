import type { Category } from '../types';

const CATEGORY_LABELS: Record<Exclude<Category, 'total'>, { std: string; mario: string }> = {
  immersivelab_points: { std: 'Immersive Lab', mario: 'IMMERSIVE LAB' },
  mario_points: { std: 'Mario', mario: 'MARIO' },
  crokinole_points: { std: 'Crokinole', mario: 'CROKINOLE' },
};

type Props = { isMario: boolean; category: Category };

export function LeaderboardTableHead({ isMario, category }: Props) {
  const theadRowCls = isMario
    ? 'text-ink-black text-left text-[10px] sm:text-xs font-pixel tight-px'
    : 'bg-surface-off dark:bg-dark-hover text-ink-black dark:text-dark-text text-left text-xs sm:text-sm 2xl:text-base font-semibold';

  return (
    <thead>
      <tr
        className={theadRowCls}
        style={
          isMario
            ? {
                background: 'var(--mario-parchment-dark)',
                borderBottom: '4px solid var(--mario-ink)',
              }
            : undefined
        }
      >
        <th className="px-2 sm:px-4 py-2 sm:py-3 w-12 sm:w-16 lg:w-20 text-center">#</th>
        <th className="hidden sm:table-cell px-2 py-3 w-14" aria-label="Team avatar" />
        <th className="px-2 sm:px-4 py-2 sm:py-3">{isMario ? 'TEAM' : 'Team'}</th>
        {category === 'total' ? (
          <>
            <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center w-44 whitespace-nowrap">
              Immersive Lab
            </th>
            <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center w-24 whitespace-nowrap">
              {isMario ? 'MARIO' : 'Mario'}
            </th>
            <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center w-32 whitespace-nowrap">
              {isMario ? 'CROKINOLE' : 'Crokinole'}
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-24 sm:w-32">
              {isMario ? 'TOTAL' : 'Total'}
            </th>
          </>
        ) : (
          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-28 sm:w-40 whitespace-nowrap">
            {isMario ? CATEGORY_LABELS[category].mario : CATEGORY_LABELS[category].std}
          </th>
        )}
        <th className="hidden md:table-cell px-4 py-3 text-right w-40">
          {isMario ? 'LAST ACT.' : 'Last activity'}
        </th>
      </tr>
    </thead>
  );
}
