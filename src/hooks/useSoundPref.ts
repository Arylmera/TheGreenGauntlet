import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'gg.sound';

function readInitial(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'on') return true;
    if (stored === 'off') return false;
  } catch {
    // ignore
  }
  return false; // default muted
}

export function useSoundPref(): { enabled: boolean; toggle: () => void; set: (v: boolean) => void } {
  const [enabled, setEnabled] = useState<boolean>(() => readInitial());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // ignore
    }
  }, [enabled]);

  return {
    enabled,
    toggle: useCallback(() => setEnabled((v) => !v), []),
    set: useCallback((v: boolean) => setEnabled(v), []),
  };
}
