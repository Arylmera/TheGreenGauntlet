import { HamburgerMenu } from '../../components/menu/HamburgerMenu';
import type { Theme } from '../../hooks/useTheme';

type Props = {
  isMario: boolean;
  updatedAt: string | null;
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  onLogout: () => void;
};

export function AdminHeader({ isMario, updatedAt, theme, onSetTheme, onLogout }: Props) {
  return (
    <header
      className={
        isMario
          ? 'relative z-40 px-4 sm:px-6 py-3 flex items-center justify-between'
          : 'relative z-40 bg-surface-white dark:bg-dark-card border-b border-line-light dark:border-dark-line px-4 sm:px-6 py-3 flex items-center justify-between'
      }
    >
      <div>
        <h1
          className={
            isMario
              ? 'font-pixel text-white text-[14px] sm:text-[16px] tight-px'
              : 'text-lg sm:text-xl font-semibold text-ink-black dark:text-dark-text'
          }
          style={
            isMario
              ? {
                  textShadow:
                    '-2px 0 #1a1a1a, 2px 0 #1a1a1a, 0 -2px #1a1a1a, 0 2px #1a1a1a, 0 3px 0 rgba(0,0,0,0.35)',
                }
              : undefined
          }
        >
          {isMario ? 'ADMIN · BONUS POINTS' : 'Admin — Bonus points'}
        </h1>
        {updatedAt && (
          <p
            className={
              isMario
                ? 'font-crt text-white text-base mt-1'
                : 'text-xs text-ink-mid dark:text-dark-dim'
            }
          >
            Last refresh {new Date(updatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <a
          href="/"
          className={
            isMario
              ? 'pixel-btn pixel-btn-ghost'
              : 'px-3 py-2 rounded-standard border border-line-light dark:border-dark-line text-sm text-ink-black dark:text-dark-text hover:bg-surface-panel dark:hover:bg-dark-hover'
          }
        >
          {isMario ? 'LEADERBOARD' : 'Leaderboard'}
        </a>
        <a
          href="/api/admin/export.csv"
          className={
            isMario
              ? 'pixel-btn pixel-btn-ghost'
              : 'px-3 py-2 rounded-standard border border-line-light dark:border-dark-line text-sm text-ink-black dark:text-dark-text hover:bg-surface-panel dark:hover:bg-dark-hover'
          }
        >
          {isMario ? 'EXPORT CSV' : 'Export CSV'}
        </a>
        <button
          type="button"
          onClick={onLogout}
          className={
            isMario
              ? 'pixel-btn pixel-btn-ghost'
              : 'px-3 py-2 rounded-standard border border-line-light dark:border-dark-line text-sm text-ink-black dark:text-dark-text hover:bg-surface-panel dark:hover:bg-dark-hover'
          }
        >
          {isMario ? 'LOG OUT' : 'Log out'}
        </button>
        <HamburgerMenu theme={theme} onSetTheme={onSetTheme} compact />
      </div>
    </header>
  );
}
