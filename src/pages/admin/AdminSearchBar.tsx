type Props = {
  isMario: boolean;
  value: string;
  onChange: (value: string) => void;
};

export function AdminSearchBar({ isMario, value, onChange }: Props) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={isMario ? 'SEARCH TEAM…' : 'Search team…'}
      className={
        isMario
          ? 'pixel-input w-full sm:w-56'
          : 'w-full sm:max-w-xs px-3 py-2 rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text text-sm placeholder:text-ink-mid dark:placeholder:text-dark-dim focus:outline-none focus:ring-2 focus:ring-brand-green'
      }
    />
  );
}
