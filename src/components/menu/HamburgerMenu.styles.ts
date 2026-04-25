export function hamburgerClasses(
  isMario: boolean,
  compact: boolean | 'pill' = false,
) {
  let size = 'w-11 h-11';
  if (compact === 'pill') size = isMario ? 'w-[43px] h-[43px]' : 'w-[34px] h-[34px]';
  else if (compact) size = isMario ? 'w-[43px] h-[43px]' : 'w-[38px] h-[38px]';
  return {
    trigger: isMario
      ? `inline-flex items-center justify-center ${size} bg-[color:var(--mario-parchment)] border-[3px] border-[color:var(--mario-ink)] rounded-[3px] text-[color:var(--mario-ink)] focus-ring transition-transform hover:-translate-y-px active:translate-y-px`
      : `inline-flex items-center justify-center ${size} rounded-standard bg-surface-off dark:bg-dark-card border border-line-light dark:border-dark-line text-ink-charcoal dark:text-dark-mid hover:bg-line-light dark:hover:bg-dark-hover focus-ring transition-colors`,
    panel: isMario
      ? 'absolute right-0 mt-2 z-50 min-w-[12rem] bg-[color:var(--mario-parchment)] border-[3px] border-[color:var(--mario-ink)] rounded-[3px] py-1 shadow-[0_4px_0_rgba(0,0,0,0.3)]'
      : 'absolute right-0 mt-2 z-50 min-w-[12rem] bg-surface-white dark:bg-dark-card border border-line-light dark:border-dark-line rounded-standard shadow-lvl-2 py-1',
    heading: isMario
      ? 'px-3 py-1 font-pixel text-[10px] text-[color:var(--mario-ink)] tight-px'
      : 'px-3 py-1 text-xs uppercase tracking-wide text-ink-charcoal dark:text-dark-mid',
    item: isMario
      ? 'w-full flex items-center gap-3 px-3 py-2 min-h-[44px] text-left font-pixel text-[10px] tight-px text-[color:var(--mario-ink)] hover:bg-[color:var(--mario-parchment-dark)] focus-ring'
      : 'w-full flex items-center gap-3 px-3 py-2 min-h-[44px] text-left text-sm text-ink-black dark:text-dark-text hover:bg-surface-off dark:hover:bg-dark-hover focus-ring',
    iconWrap: isMario
      ? 'w-5 h-5 inline-flex items-center justify-center text-[color:var(--mario-ink)]'
      : 'w-5 h-5 inline-flex items-center justify-center text-ink-charcoal dark:text-dark-mid',
    divider: isMario
      ? 'my-1 border-t-[3px] border-[color:var(--mario-ink)]'
      : 'my-1 border-t border-line-light dark:border-dark-line',
  };
}
