import { useAnnouncement } from '../../hooks/useAnnouncement';
import type { Theme } from '../../hooks/useTheme';

type Props = {
  theme: Theme;
};

export function AnnouncementBanner({ theme }: Props) {
  const { message, isDismissed, dismiss } = useAnnouncement();
  if (!message || isDismissed) return null;

  const isMario = theme === 'mario';
  const containerCls = isMario
    ? 'mb-4 flex items-start gap-3 rounded-[3px] border-[3px] border-[color:var(--mario-brick)] bg-[#fff8d6] text-[color:var(--mario-ink)] px-3 py-2 font-crt text-lg'
    : 'mb-4 flex items-start gap-3 rounded-standard border border-brand-green bg-brand-mint dark:bg-[#1f3a2d] text-ink-black dark:text-dark-text px-4 py-3 text-sm';

  const buttonCls = isMario
    ? 'shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] -my-2 -mr-2 text-2xl leading-none font-pixel text-[color:var(--mario-ink)] hover:opacity-70'
    : 'shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] -my-2 -mr-2 text-xl leading-none text-ink-charcoal dark:text-dark-mid hover:opacity-70';

  return (
    <div role="status" aria-live="polite" className={containerCls}>
      <span aria-hidden="true" className="shrink-0 min-w-[44px] -my-2 -ml-2" />
      <span className="flex-1 break-words whitespace-pre-wrap text-center">{message}</span>
      <button type="button" onClick={dismiss} aria-label="Dismiss announcement" className={buttonCls}>
        ×
      </button>
    </div>
  );
}
