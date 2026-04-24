import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'mario';

const STORAGE_KEY = 'gg.theme';
const CYCLE: Theme[] = ['light', 'dark', 'mario'];

function coerce(stored: string | null): Theme | null {
  if (stored === 'light' || stored === 'dark' || stored === 'mario') return stored;
  if (stored === 'true') return 'dark';
  if (stored === 'false') return 'light';
  return null;
}

function readInitial(): Theme {
  try {
    const stored = coerce(window.localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // ignore — storage blocked
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
}

export function useTheme(): { theme: Theme; toggle: () => void; set: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(() => readInitial());

  useEffect(() => {
    apply(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const set = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(
    () => setThemeState((t) => CYCLE[(CYCLE.indexOf(t) + 1) % CYCLE.length] ?? 'light'),
    [],
  );

  return { theme, toggle, set };
}
