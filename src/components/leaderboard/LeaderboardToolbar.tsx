import type { Category } from '../../types';
import { LeaderboardTabs } from './LeaderboardTabs';

type Props = {
  isMario: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  category: Category;
  onCategoryChange: ((next: Category) => void) | undefined;
  panelId: string;
  showTopThree: boolean;
  onToggleTopThree: (next: boolean) => void;
};

export function LeaderboardToolbar({
  isMario,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  panelId,
  showTopThree,
  onToggleTopThree,
}: Props) {
  const toolbarCls = isMario
    ? 'scroll-header px-4 pt-8 sm:pt-10 pb-2 sm:pb-3 flex items-center justify-between gap-2 sm:gap-4 flex-wrap'
    : 'px-2 sm:px-4 py-2 sm:py-3 border-b border-line-light dark:border-dark-line bg-surface-off dark:bg-dark-hover flex items-center justify-between gap-3 flex-wrap';

  const inputCls = isMario
    ? 'pixel-input w-full sm:w-56'
    : 'w-full sm:max-w-xs px-3 py-2 rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text text-sm placeholder:text-ink-mid dark:placeholder:text-dark-dim focus:outline-none focus:ring-2 focus:ring-brand-green';

  const topThreeToggle = (
    <label
      className={
        isMario
          ? 'inline-flex items-center gap-2 cursor-pointer select-none'
          : 'inline-flex items-center gap-2 cursor-pointer select-none text-sm text-ink-mid dark:text-dark-dim'
      }
      title="Show top 3 in the table"
    >
      <input
        type="checkbox"
        checked={showTopThree}
        onChange={(e) => onToggleTopThree(e.target.checked)}
        aria-label="Show top 3 in table"
        className="sr-only peer"
      />
      {isMario ? (
        <span className="mushroom-toggle" />
      ) : (
        <span className="relative w-10 h-5 rounded-full bg-line-light dark:bg-dark-line transition-colors peer-checked:bg-brand-green peer-focus-visible:ring-2 peer-focus-visible:ring-brand-green peer-focus-visible:ring-offset-2 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
      )}
      <span
        className={
          isMario
            ? 'font-pixel text-white text-[10px] sm:text-[12px] tight-px'
            : ''
        }
        style={
          isMario
            ? {
                textShadow:
                  '-1px 0 #1a1a1a, 1px 0 #1a1a1a, 0 -1px #1a1a1a, 0 1px #1a1a1a',
              }
            : undefined
        }
      >
        Show top 3
      </span>
    </label>
  );

  const searchInput = (
    <label className={isMario ? 'relative block w-full sm:w-56' : 'relative block sm:ml-auto w-full sm:w-auto'}>
      <span className="sr-only">Search team</span>
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search team…"
        className={inputCls}
      />
    </label>
  );

  return (
    <div className={toolbarCls}>
      {onCategoryChange && (
        <LeaderboardTabs value={category} onChange={onCategoryChange} panelId={panelId} />
      )}
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap ml-auto">
        {topThreeToggle}
        {searchInput}
      </div>
    </div>
  );
}
