type Props = { busy: boolean; count: number; onApply: () => void; isMario: boolean };

export function ApplyBar({ busy, count, onApply, isMario }: Props) {
  return (
    <div className="my-3 flex items-center justify-end gap-3">
      <span
        className={
          isMario ? 'font-crt text-lg text-white' : 'text-sm text-ink-mid dark:text-dark-dim'
        }
        style={isMario ? { textShadow: '0 2px 0 rgba(0,0,0,0.35)' } : undefined}
      >
        {count === 0
          ? isMario
            ? 'NO PENDING CHANGES'
            : 'No pending changes'
          : isMario
            ? `${count} PENDING`
            : `${count} pending`}
      </span>
      <button
        type="button"
        onClick={onApply}
        disabled={busy || count === 0}
        className={
          isMario
            ? 'pixel-btn pixel-btn-green'
            : 'px-4 py-2 rounded-standard bg-brand-green text-white font-medium disabled:opacity-60'
        }
      >
        {busy ? (isMario ? 'APPLYING…' : 'Applying…') : isMario ? 'APPLY' : 'Apply'}
      </button>
    </div>
  );
}
