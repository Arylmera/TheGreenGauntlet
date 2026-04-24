import logo from '../../assets/logo.png';
import { UpdatedPill } from '../UpdatedPill';
import { HamburgerMenu } from '../menu/HamburgerMenu';
import type { Theme } from '../../hooks/useTheme';

type Props = {
  updatedAt: string | null;
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
};

export function Header({ updatedAt, theme, onSetTheme, soundEnabled, onToggleSound }: Props) {
  const isMario = theme === 'mario';
  return (
    <header
      className={
        isMario
          ? 'relative z-40'
          : 'relative z-40 bg-surface-white dark:bg-dark-card border-b border-line-light dark:border-dark-line'
      }
    >
      <div
        className={
          isMario
            ? 'relative max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-2 flex items-center justify-between gap-3 sm:gap-6 flex-wrap'
            : 'relative max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 flex items-center justify-between gap-3 sm:gap-6'
        }
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {!isMario && (
            <img
              src={logo}
              alt="The Green Gauntlet"
              className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 2xl:w-20 2xl:h-20 shrink-0 select-none"
            />
          )}
          {isMario ? (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <QBlock size={54} />
                <h1 className="title-chunk text-[20px] sm:text-[26px] lg:text-[34px] xl:text-[42px] pl-[4px] pr-[2px]" style={{ overflow: 'visible' }}>
                  <span className="green">THE GREEN</span>
                  <br className="hidden sm:inline" />
                  <span className="gauntlet"> GAUNTLET</span>
                </h1>
              </div>
              <p
                  className="font-crt text-white text-base sm:text-lg lg:text-xl mt-2 tight-px"
                  style={{ textShadow: '0 2px 0 rgba(0,0,0,0.35)' }}
                >
                  BNP Paribas Fortis · DevOps Day · Live Standings
                </p>
            </div>
          ) : (
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-page-title text-ink-black dark:text-dark-text leading-none truncate">
                The Green Gauntlet
              </h1>
              <p className="text-ink-charcoal dark:text-dark-mid text-xs sm:text-sm 2xl:text-base mt-0.5 sm:mt-1 tracking-tight truncate">
                <span className="hidden sm:inline">BNP Paribas Fortis DevOps Day · </span>Live Standings
              </p>
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2 sm:gap-3">
          <UpdatedPill updatedAt={updatedAt} />
          <HamburgerMenu
            theme={theme}
            onSetTheme={onSetTheme}
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
          />
        </div>
      </div>
    </header>
  );
}

function QBlock({ size }: { size: number }) {
  return (
    <span
      className="q-block"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden
    >
      ?
    </span>
  );
}
