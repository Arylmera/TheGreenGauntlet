import { useCallback, useEffect, useState } from 'react';
import {
  clearAdminAnnouncement,
  getAdminAnnouncement,
  setAdminAnnouncement,
  type AnnouncementResponse,
} from '../../api/admin';

const MAX_LENGTH = 280;

type Props = {
  isMario: boolean;
  onUnauthorized: () => void;
};

export function AnnouncementPanel({ isMario, onUnauthorized }: Props) {
  const [current, setCurrent] = useState<AnnouncementResponse | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthError = useCallback(
    (err: unknown): boolean => {
      if ((err as { status?: number }).status === 401) {
        onUnauthorized();
        return true;
      }
      return false;
    },
    [onUnauthorized],
  );

  const load = useCallback(async (): Promise<void> => {
    try {
      const next = await getAdminAnnouncement();
      setCurrent(next);
      setDraft(next.message ?? '');
    } catch (err) {
      if (handleAuthError(err)) return;
      setError((err as Error).message);
    }
  }, [handleAuthError]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (): Promise<void> => {
    if (draft.length > MAX_LENGTH) {
      setError(`Message exceeds ${MAX_LENGTH} characters`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await setAdminAnnouncement(draft);
      setCurrent(next);
      setDraft(next.message ?? '');
    } catch (err) {
      if (handleAuthError(err)) return;
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onClear = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const next = await clearAdminAnnouncement();
      setCurrent(next);
      setDraft('');
    } catch (err) {
      if (handleAuthError(err)) return;
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sectionCls = isMario
    ? 'scroll-panel p-2 sm:p-3 my-2'
    : 'bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line shadow-lvl-1 p-3 my-2';

  const labelCls = isMario
    ? 'block font-pixel text-[color:var(--mario-ink)] tight-px text-xs mb-0.5'
    : 'block text-xs font-medium text-ink-charcoal dark:text-dark-mid mb-0.5';

  const textareaCls = isMario
    ? 'pixel-input w-full min-h-[48px]'
    : 'w-full min-h-[48px] rounded-standard border border-line-light dark:border-dark-line bg-surface-off dark:bg-dark-page text-ink-black dark:text-dark-text px-2 py-1 text-sm';

  const primaryBtn = isMario
    ? 'min-h-[32px] px-3 rounded-[3px] border-[3px] border-[color:var(--mario-brick)] bg-[color:var(--mario-coin)] text-[color:var(--mario-ink)] font-pixel text-sm disabled:opacity-50'
    : 'min-h-[32px] px-3 rounded-standard bg-brand-green text-white text-sm font-medium disabled:opacity-50';

  const secondaryBtn = isMario
    ? 'min-h-[32px] px-3 rounded-[3px] border-[3px] border-[color:var(--mario-brick)] bg-white text-[color:var(--mario-ink)] font-pixel text-sm disabled:opacity-50'
    : 'min-h-[32px] px-3 rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text text-sm disabled:opacity-50';

  const remaining = MAX_LENGTH - draft.length;
  const overLimit = remaining < 0;

  return (
    <section className={sectionCls} aria-labelledby="announcement-panel-heading">
      <h2 id="announcement-panel-heading" className={isMario ? 'font-pixel text-[color:var(--mario-ink)] tight-px text-sm mb-1' : 'text-sm font-semibold text-ink-black dark:text-dark-text mb-1'}>
        Announcement banner
      </h2>

      {error && (
        <div
          role="alert"
          className={
            isMario
              ? 'mb-2 rounded-[3px] border-[3px] border-[color:var(--mario-brick)] bg-[#fde8e8] text-[color:var(--mario-ink)] px-3 py-2 font-crt text-lg'
              : 'mb-2 rounded-standard border border-semantic-danger bg-[#fde8e8] dark:bg-[#3a1414] text-ink-black dark:text-dark-text px-3 py-2 text-sm'
          }
        >
          {error}
        </div>
      )}

      <label htmlFor="announcement-input" className="sr-only">
        Announcement message
      </label>
      <textarea
        id="announcement-input"
        className={textareaCls}
        value={draft}
        maxLength={MAX_LENGTH + 50}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g. Lunch in 10 minutes"
      />
      <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" className={primaryBtn} onClick={() => void onSave()} disabled={busy || overLimit}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => void onClear()}
            disabled={busy || (current?.message ?? '') === ''}
          >
            Clear
          </button>
          <span
            className={
              (isMario ? 'font-crt text-base ' : 'text-xs ') +
              (overLimit ? 'text-semantic-danger' : isMario ? 'text-[color:var(--mario-ink)]' : 'text-ink-mid dark:text-dark-mid')
            }
          >
            {remaining} characters left
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap ml-auto">
          <span className={isMario ? 'font-crt text-base text-[color:var(--mario-ink)]' : 'text-xs text-ink-mid dark:text-dark-mid'}>
            {current?.message
              ? `Live: "${current.message}" — updated ${formatWhen(current.updatedAt)}`
              : 'No live announcement.'}
          </span>
        </div>
      </div>
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}
