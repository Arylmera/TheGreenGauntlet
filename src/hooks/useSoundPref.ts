import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'gg.sound';

export function useSoundPref(): { enabled: boolean; toggle: () => void; set: (v: boolean) => void } {
  const [enabled, setEnabled] = useLocalStorage<boolean>(STORAGE_KEY, false, {
    parse: (raw) => (raw === 'on' ? true : raw === 'off' ? false : null),
    serialize: (v) => (v ? 'on' : 'off'),
  });

  return {
    enabled,
    toggle: useCallback(() => setEnabled((v) => !v), [setEnabled]),
    set: useCallback((v: boolean) => setEnabled(v), [setEnabled]),
  };
}
