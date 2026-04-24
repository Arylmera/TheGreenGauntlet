import type { AdminBonusTeam, BonusCategory } from '../../types';

export const CATEGORIES: readonly BonusCategory[] = ['mario', 'crokinole', 'helping'];
export const CATEGORY_LABEL: Record<BonusCategory, string> = {
  mario: 'Mario',
  crokinole: 'Crokinole',
  helping: 'Helping',
};

type Props = {
  team: AdminBonusTeam;
  deltas: Partial<Record<BonusCategory, string>>;
  onDeltaChange: (category: BonusCategory, value: string) => void;
  onToggleActive: (active: boolean) => void;
  isMario: boolean;
};

export function AdminRow({ team, deltas, onDeltaChange, onToggleActive, isMario }: Props) {
  const dimmed = team.active ? '' : 'opacity-50';
  const rowCls = isMario
    ? `scroll-row ${dimmed}`
    : `border-b border-line-light dark:border-dark-line ${dimmed}`;
  const nameCls = isMario
    ? 'px-3 py-2 sm:py-3 font-pixel text-[11px] text-[color:var(--mario-ink)] tight-px'
    : 'px-3 py-2 sm:py-3 text-ink-black dark:text-dark-text font-medium text-sm sm:text-base';
  const numCls = isMario
    ? 'px-3 py-2 sm:py-3 text-center num text-xl text-[color:var(--mario-ink)]'
    : 'px-3 py-2 sm:py-3 text-center tabular text-sm';
  const totalCls = isMario
    ? 'px-3 py-2 sm:py-3 text-center num text-2xl font-bold text-[color:var(--mario-ink)]'
    : 'px-3 py-2 sm:py-3 text-center tabular font-bold text-sm sm:text-base text-ink-black dark:text-dark-text';
  const inputCls = isMario
    ? 'pixel-coin-input'
    : 'w-24 px-2 py-1 text-center rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-green';

  return (
    <tr className={rowCls}>
      <td className={nameCls}>{team.teamName}</td>
      <td className="px-3 py-2 sm:py-3 text-center">
        <label className="inline-flex items-center cursor-pointer align-middle">
          <input
            type="checkbox"
            checked={team.active}
            onChange={(e) => onToggleActive(e.target.checked)}
            aria-label={`Active ${team.teamName}`}
            className="sr-only peer"
          />
          <span className="relative w-10 h-5 rounded-full bg-line-light dark:bg-dark-line transition-colors peer-checked:bg-brand-green peer-focus-visible:ring-2 peer-focus-visible:ring-brand-green peer-focus-visible:ring-offset-2 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </td>
      <td className={numCls}>{team.immersivelab_points.toLocaleString('en-US')}</td>
      <td className={numCls}>{team.mario_points.toLocaleString('en-US')}</td>
      <td className={numCls}>{team.crokinole_points.toLocaleString('en-US')}</td>
      <td className={numCls}>{team.helping_points.toLocaleString('en-US')}</td>
      {CATEGORIES.map((category) => (
        <td key={category} className="px-3 py-2 sm:py-3 text-center">
          <input
            type="number"
            inputMode="numeric"
            value={deltas[category] ?? ''}
            onChange={(e) => onDeltaChange(category, e.target.value)}
            placeholder="0"
            aria-label={`Delta ${CATEGORY_LABEL[category]} for ${team.teamName}`}
            className={inputCls}
          />
        </td>
      ))}
      <td className={totalCls}>{team.total.toLocaleString('en-US')}</td>
    </tr>
  );
}
