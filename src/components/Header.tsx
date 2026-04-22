import logo from '../assets/logo.png';
import { UpdatedPill } from './UpdatedPill';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../hooks/useTheme';

type Props = {
  updatedAt: string | null;
  theme: Theme;
  onToggleTheme: () => void;
};

export function Header({ updatedAt, theme, onToggleTheme }: Props) {
  return (
    <header className="bg-surface-white dark:bg-dark-card border-b border-line-light dark:border-dark-line">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 flex items-center justify-between gap-3 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <img
            src={logo}
            alt="The Green Gauntlet"
            className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 2xl:w-20 2xl:h-20 shrink-0 select-none"
          />
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-page-title text-ink-black dark:text-dark-text leading-none truncate">
              The Green Gauntlet
            </h1>
            <p className="text-ink-charcoal dark:text-dark-mid text-xs sm:text-sm 2xl:text-base mt-0.5 sm:mt-1 tracking-tight truncate">
              <span className="hidden sm:inline">BNP Paribas Fortis DevOps Day · </span>Live Standings
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 sm:gap-3">
          <UpdatedPill updatedAt={updatedAt} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
