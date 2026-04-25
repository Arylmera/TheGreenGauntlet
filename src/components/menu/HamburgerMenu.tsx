import { useCallback, useEffect, useRef, useState } from 'react';
import type { Theme } from '../../hooks/useTheme';
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside';
import { useMenuArrowNav } from '../../hooks/useMenuArrowNav';
import { HamburgerIcon } from './HamburgerMenu.icons';
import { hamburgerClasses } from './HamburgerMenu.styles';
import { SoundMenuItem } from './SoundMenuItem';
import { ThemeMenuItem } from './ThemeMenuItem';

type Props = {
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  compact?: boolean | 'pill';
};

const THEME_OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'mario', label: 'Arcade' },
];

const ITEM_SELECTOR = '[role="menuitemradio"], [role="menuitemcheckbox"]';

export function HamburgerMenu({
  theme,
  onSetTheme,
  soundEnabled,
  onToggleSound,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isMario = theme === 'mario';
  const cls = hamburgerClasses(isMario, compact);

  const close = useCallback(() => setOpen(false), []);
  const focusTrigger = useCallback(() => triggerRef.current?.focus(), []);
  const onMenuKeyDown = useMenuArrowNav(menuRef, ITEM_SELECTOR);

  useDismissOnOutside({
    active: open,
    refs: [menuRef, triggerRef],
    onDismiss: close,
    onEscape: focusTrigger,
  });

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
  }, [open]);

  const handleSelectTheme = (t: Theme) => {
    onSetTheme(t);
    setOpen(false);
    focusTrigger();
  };

  const showSound = isMario && onToggleSound !== undefined;

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
        className={cls.trigger}
      >
        <HamburgerIcon />
      </button>

      {open && (
        <div
          ref={menuRef}
          id="gg-hamburger-menu"
          role="menu"
          aria-label="Settings"
          onKeyDown={onMenuKeyDown}
          className={cls.panel}
        >
          <div className={cls.heading}>{isMario ? 'THEME' : 'Theme'}</div>
          {THEME_OPTIONS.map((opt) => (
            <ThemeMenuItem
              key={opt.value}
              value={opt.value}
              label={opt.label}
              selected={theme === opt.value}
              isMario={isMario}
              itemCls={cls.item}
              iconWrapCls={cls.iconWrap}
              onSelect={handleSelectTheme}
            />
          ))}

          {showSound && (
            <>
              <div className={cls.divider} />
              <SoundMenuItem
                enabled={!!soundEnabled}
                isMario={isMario}
                itemCls={cls.item}
                iconWrapCls={cls.iconWrap}
                onToggle={() => onToggleSound?.()}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
