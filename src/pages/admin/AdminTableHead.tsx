type Props = { isMario: boolean };

export function AdminTableHead({ isMario }: Props) {
  return (
    <thead>
      <tr
        className={
          isMario
            ? 'text-[color:var(--mario-ink)] text-left font-pixel text-[10px] tight-px'
            : 'bg-surface-off dark:bg-dark-hover text-ink-black dark:text-dark-text text-left text-xs sm:text-sm font-semibold'
        }
        style={
          isMario
            ? {
                background: 'var(--mario-parchment-dark)',
                borderBottom: '4px solid var(--mario-ink)',
              }
            : undefined
        }
      >
        <th className="px-3 py-2 sm:py-3">{isMario ? 'TEAM' : 'Team'}</th>
        <th className="px-3 py-2 sm:py-3 w-20 text-center">
          {isMario ? 'ACTIVE' : 'Active'}
        </th>
        <th className="px-3 py-2 sm:py-3 w-28 text-center whitespace-nowrap">Immersive Lab</th>
        <th className="px-3 py-2 sm:py-3 w-24 text-center whitespace-nowrap">
          {isMario ? 'MARIO' : 'Mario'}
        </th>
        <th className="px-3 py-2 sm:py-3 w-24 text-center whitespace-nowrap">
          {isMario ? 'CROKINOLE' : 'Crokinole'}
        </th>
        <th className="px-3 py-2 sm:py-3 w-24 text-center whitespace-nowrap">
          {isMario ? 'HELPING' : 'Helping'}
        </th>
        <th className="px-3 py-2 sm:py-3 w-28 text-center">{isMario ? 'MARIO' : 'Mario'}</th>
        <th className="px-3 py-2 sm:py-3 w-28 text-center">
          {isMario ? 'CROKINOLE' : 'Crokinole'}
        </th>
        <th className="px-3 py-2 sm:py-3 w-28 text-center">{isMario ? 'HELPING' : 'Helping'}</th>
        <th className="px-3 py-2 sm:py-3 w-24 text-center">{isMario ? 'TOTAL' : 'Total'}</th>
      </tr>
    </thead>
  );
}
