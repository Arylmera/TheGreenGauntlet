import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../hooks/useTheme';

type Props = {
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
};

const THEME_OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'mario', label: 'Arcade' },
];

export function HamburgerMenu({ theme, onSetTheme, soundEnabled, onToggleSound }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitemradio"], [role="menuitemcheckbox"]');
    first?.focus();
  }, [open]);

  function handleSelectTheme(t: Theme) {
    onSetTheme(t);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"], [role="menuitemcheckbox"]') ?? [],
    );
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + delta + items.length) % items.length;
    items[nextIndex]?.focus();
    e.preventDefault();
  }

  const showSound = theme === 'mario' && onToggleSound !== undefined;
  const isMario = theme === 'mario';

  const triggerCls = isMario
    ? 'inline-flex items-center justify-center w-11 h-11 bg-[color:var(--mario-parchment)] border-[3px] border-[color:var(--mario-ink)] rounded-[3px] text-[color:var(--mario-ink)] focus-ring transition-transform hover:-translate-y-px active:translate-y-px'
    : 'inline-flex items-center justify-center w-11 h-11 rounded-standard bg-surface-off dark:bg-dark-card border border-line-light dark:border-dark-line text-ink-charcoal dark:text-dark-mid hover:bg-line-light dark:hover:bg-dark-hover focus-ring transition-colors';

  const panelCls = isMario
    ? 'absolute right-0 mt-2 z-50 min-w-[12rem] bg-[color:var(--mario-parchment)] border-[3px] border-[color:var(--mario-ink)] rounded-[3px] py-1 shadow-[0_4px_0_rgba(0,0,0,0.3)]'
    : 'absolute right-0 mt-2 z-50 min-w-[12rem] bg-surface-white dark:bg-dark-card border border-line-light dark:border-dark-line rounded-standard shadow-lvl-2 py-1';

  const headingCls = isMario
    ? 'px-3 py-1 font-pixel text-[10px] text-[color:var(--mario-ink)] tight-px'
    : 'px-3 py-1 text-xs uppercase tracking-wide text-ink-charcoal dark:text-dark-mid';

  const itemCls = isMario
    ? 'w-full flex items-center gap-3 px-3 py-2 min-h-[44px] text-left font-pixel text-[10px] tight-px text-[color:var(--mario-ink)] hover:bg-[color:var(--mario-parchment-dark)] focus-ring'
    : 'w-full flex items-center gap-3 px-3 py-2 min-h-[44px] text-left text-sm text-ink-black dark:text-dark-text hover:bg-surface-off dark:hover:bg-dark-hover focus-ring';

  const iconWrapCls = isMario
    ? 'w-5 h-5 inline-flex items-center justify-center text-[color:var(--mario-ink)]'
    : 'w-5 h-5 inline-flex items-center justify-center text-ink-charcoal dark:text-dark-mid';

  const dividerCls = isMario
    ? 'my-1 border-t-[3px] border-[color:var(--mario-ink)]'
    : 'my-1 border-t border-line-light dark:border-dark-line';

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="gg-hamburger-menu"
        className={triggerCls}
      >
        <HamburgerIcon />
      </button>

      {open && (
        <div
          ref={menuRef}
          id="gg-hamburger-menu"
          role="menu"
          aria-label="Settings"
          onKeyDown={handleMenuKeyDown}
          className={panelCls}
        >
          <div className={headingCls}>
            {isMario ? 'THEME' : 'Theme'}
          </div>
          {THEME_OPTIONS.map((opt) => {
            const selected = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => handleSelectTheme(opt.value)}
                className={itemCls}
              >
                <span className={iconWrapCls}>
                  {opt.value === 'light' && <SunIcon />}
                  {opt.value === 'dark' && <MoonIcon />}
                  {opt.value === 'mario' && <MushroomIcon />}
                </span>
                <span className="flex-1">{isMario ? opt.label.toUpperCase() : opt.label}</span>
                {selected && <CheckIcon />}
              </button>
            );
          })}

          {showSound && (
            <>
              <div className={dividerCls} />
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={soundEnabled}
                onClick={() => onToggleSound?.()}
                className={itemCls}
              >
                <span className={iconWrapCls}>
                  {soundEnabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
                </span>
                <span className="flex-1">{isMario ? 'SOUND FX' : 'Sound effects'}</span>
                {soundEnabled && <CheckIcon />}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MushroomIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 12a8 8 0 0 1 16 0v2H4v-2z" fill="#e52521" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="9" cy="10" r="1.8" fill="#f8f4e3" />
      <circle cx="15" cy="10" r="1.8" fill="#f8f4e3" />
      <rect x="8" y="14" width="8" height="6" rx="1" fill="#f8f4e3" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="10.5" cy="17" r="0.7" fill="#1a1a1a" />
      <circle cx="13.5" cy="17" r="0.7" fill="#1a1a1a" />
    </svg>
  );
}

function SpeakerOnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
