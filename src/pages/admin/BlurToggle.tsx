import { useCallback, useEffect, useState } from 'react';
import { getAdminBlur, setAdminBlur, type BlurResponse } from '../../api/admin';

type Props = {
  isMario: boolean;
  onUnauthorized: () => void;
};

export function BlurToggle({ isMario, onUnauthorized }: Props) {
  const [current, setCurrent] = useState<BlurResponse | null>(null);
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

  useEffect(() => {
    void (async () => {
      try {
        setCurrent(await getAdminBlur());
      } catch (err) {
        if (handleAuthError(err)) return;
        setError((err as Error).message);
      }
    })();
  }, [handleAuthError]);

  const onToggle = async (): Promise<void> => {
    if (!current) return;
    const next = !current.blurPoints;
    setBusy(true);
    setError(null);
    const previous = current;
    setCurrent({ ...current, blurPoints: next });
    try {
      const fresh = await setAdminBlur(next);
      setCurrent(fresh);
    } catch (err) {
      setCurrent(previous);
      if (handleAuthError(err)) return;
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sectionCls = isMario
    ? 'scroll-panel p-2 sm:p-3 my-2 flex flex-col justify-between gap-2'
    : 'bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line shadow-lvl-1 p-3 my-2 flex flex-col justify-between gap-2';

  const isOn = current?.blurPoints === true;

  const buttonCls = isMario
    ? `min-h-[32px] px-3 rounded-[3px] border-[3px] border-[color:var(--mario-brick)] font-pixel text-sm disabled:opacity-50 ${
        isOn
          ? 'bg-[color:var(--mario-brick)] text-white'
          : 'bg-[color:var(--mario-coin)] text-[color:var(--mario-ink)]'
      }`
    : `min-h-[32px] px-3 rounded-standard text-sm font-medium disabled:opacity-50 ${
        isOn ? 'bg-semantic-danger text-white' : 'bg-brand-green text-white'
      }`;

  return (
    <section className={sectionCls} aria-labelledby="blur-toggle-heading">
      <h2
        id="blur-toggle-heading"
        className={
          isMario
            ? 'font-pixel text-[color:var(--mario-ink)] tight-px text-sm mb-1'
            : 'text-sm font-semibold text-ink-black dark:text-dark-text mb-1'
        }
      >
        Blur points (big reveal)
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

      <div className="flex justify-start">
        <button
          type="button"
          className={buttonCls}
          onClick={() => void onToggle()}
          disabled={busy || current === null}
          aria-pressed={isOn}
        >
          {busy ? 'Updating…' : isOn ? 'Unblur points' : 'Blur points'}
        </button>
      </div>
      <span
        className={
          isMario
            ? 'font-crt text-base text-[color:var(--mario-ink)]'
            : 'text-xs text-ink-mid dark:text-dark-mid'
        }
      >
        {current === null
          ? 'Loading…'
          : isOn
            ? 'Public dashboard is hiding every point number.'
            : 'Public dashboard is showing point numbers.'}
      </span>
    </section>
  );
}
