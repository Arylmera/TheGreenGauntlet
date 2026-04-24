import { useCallback, useEffect, useRef, useState } from 'react';
import type { Theme } from '../hooks/useTheme';
import { useDismissOnOutside } from '../hooks/useDismissOnOutside';
import {
  CheckIcon,
  HamburgerIcon,
  MoonIcon,
  MushroomIcon,
  SpeakerOffIcon,
  SpeakerOnIcon,
  SunIcon,
} from './HamburgerMenu.icons';
import { hamburgerClasses } from './HamburgerMenu.styles';

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

const ITEM_SELECTOR = '[role="menuitemradio"], [role="menuitemcheckbox"]';

export function HamburgerMenu({ theme, onSetTheme, soundEnabled, onToggleSound }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isMario = theme === 'mario';
  const cls = hamburgerClasses(isMario);

  const close = useCallback(() => setOpen(false), []);
  const focusTrigger = useCallback(() => triggerRef.current?.focus(), []);

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

  function handleSelectTheme(t: Theme) {
    onSetTheme(t);
    setOpen(false);
    focusTrigger();
  }

  function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + delta + items.length) % items.length;
    items[nextIndex]?.focus();
    e.preventDefault();
  }

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
          onKeyDown={handleMenuKeyDown}
          className={cls.panel}
        >
          <div className={cls.heading}>{isMario ? 'THEME' : 'Theme'}</div>
          {THEME_OPTIONS.map((opt) => (
            <ThemeMenuItem
              key={opt.value}
              option={opt}
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
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={soundEnabled}
                onClick={() => onToggleSound?.()}
                className={cls.item}
              >
                <span className={cls.iconWrap}>
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

type ThemeMenuItemProps = {
  option: { value: Theme; label: string };
  selected: boolean;
  isMario: boolean;
  itemCls: string;
  iconWrapCls: string;
  onSelect: (t: Theme) => void;
};

function ThemeMenuItem({
  option,
  selected,
  isMario,
  itemCls,
  iconWrapCls,
  onSelect,
}: ThemeMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={() => onSelect(option.value)}
      className={itemCls}
    >
      <span className={iconWrapCls}>
        {option.value === 'light' && <SunIcon />}
        {option.value === 'dark' && <MoonIcon />}
        {option.value === 'mario' && <MushroomIcon />}
      </span>
      <span className="flex-1">{isMario ? option.label.toUpperCase() : option.label}</span>
      {selected && <CheckIcon />}
    </button>
  );
}
