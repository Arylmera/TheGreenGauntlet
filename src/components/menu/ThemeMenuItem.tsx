import type { Theme } from '../../hooks/useTheme';
import { CheckIcon, MoonIcon, MushroomIcon, SunIcon } from './HamburgerMenu.icons';

type Props = {
  value: Theme;
  label: string;
  selected: boolean;
  isMario: boolean;
  itemCls: string;
  iconWrapCls: string;
  onSelect: (t: Theme) => void;
};

export function ThemeMenuItem({
  value,
  label,
  selected,
  isMario,
  itemCls,
  iconWrapCls,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      className={itemCls}
    >
      <span className={iconWrapCls}>
        {value === 'light' && <SunIcon />}
        {value === 'dark' && <MoonIcon />}
        {value === 'mario' && <MushroomIcon />}
      </span>
      <span className="flex-1">{isMario ? label.toUpperCase() : label}</span>
      {selected && <CheckIcon />}
    </button>
  );
}
