import type { ReactNode } from 'react';

type Props = { rightSlot?: ReactNode };

export function Footer({ rightSlot }: Props) {
  return (
    <footer className="mario-footer relative z-10 border-t border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card">
      <div className="mario-footer-inner relative max-w-screen-2xl mx-auto px-4 sm:px-8 py-4 pr-20 sm:pr-24 text-center text-ink-mid dark:text-dark-dim text-[11px] sm:text-sm">
        Powered by BNP Paribas Fortis · CCE-I
        {rightSlot && (
          <div className="absolute right-3 sm:right-6 2xl:right-10 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>
    </footer>
  );
}
