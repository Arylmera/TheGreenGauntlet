import type { Category } from '../../types';
import { LeaderboardTabs } from './LeaderboardTabs';
import { CoinIcon } from '../mario/CoinIcon';

type Props = {
  isMario: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  category: Category;
  onCategoryChange: ((next: Category) => void) | undefined;
  panelId: string;
};

export function LeaderboardToolbar({
  isMario,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  panelId,
}: Props) {
  const toolbarCls = isMario
    ? 'scroll-header px-4 pt-14 pb-3 flex items-center justify-between gap-4 flex-wrap'
    : 'px-2 sm:px-4 py-2 sm:py-3 border-b border-line-light dark:border-dark-line bg-surface-off dark:bg-dark-hover flex items-center justify-between gap-3 flex-wrap';

  const inputCls = isMario
    ? 'pixel-input w-full sm:w-56'
    : 'w-full sm:max-w-xs px-3 py-2 rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text text-sm placeholder:text-ink-mid dark:placeholder:text-dark-dim focus:outline-none focus:ring-2 focus:ring-brand-green';

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
      {isMario ? (
        <>
          <div className="flex items-center gap-3 shrink-0">
            <CoinIcon coinSize="md" spin />
            <h2
              className="font-pixel text-white text-[12px] sm:text-[14px] lg:text-[16px] tight-px"
              style={{
                textShadow:
                  '-2px 0 #1a1a1a, 2px 0 #1a1a1a, 0 -2px #1a1a1a, 0 2px #1a1a1a, 0 3px 0 rgba(0,0,0,0.35)',
              }}
            >
              LEADERBOARD · WORLD 1-1
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap ml-auto">
            {onCategoryChange && (
              <LeaderboardTabs value={category} onChange={onCategoryChange} panelId={panelId} />
            )}
            {searchInput}
          </div>
        </>
      ) : (
        <>
          {onCategoryChange && (
            <LeaderboardTabs value={category} onChange={onCategoryChange} panelId={panelId} />
          )}
          {searchInput}
        </>
      )}
    </div>
  );
}
