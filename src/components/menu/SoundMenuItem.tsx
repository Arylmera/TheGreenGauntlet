import { CheckIcon, SpeakerOffIcon, SpeakerOnIcon } from './HamburgerMenu.icons';

type Props = {
  enabled: boolean;
  isMario: boolean;
  itemCls: string;
  iconWrapCls: string;
  onToggle: () => void;
};

export function SoundMenuItem({ enabled, isMario, itemCls, iconWrapCls, onToggle }: Props) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={enabled}
      onClick={onToggle}
      className={itemCls}
    >
      <span className={iconWrapCls}>{enabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}</span>
      <span className="flex-1">{isMario ? 'SOUND FX' : 'Sound effects'}</span>
      {enabled && <CheckIcon />}
    </button>
  );
}
