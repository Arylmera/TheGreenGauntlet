import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useIsPhone } from './useIsPhone';

export type Theme = 'light' | 'dark' | 'mario';

const STORAGE_KEY = 'gg.theme';
const CYCLE: Theme[] = ['light', 'dark', 'mario'];

function coerce(stored: string | null): Theme | null {
  if (stored === 'light' || stored === 'dark' || stored === 'mario') return stored;
  if (stored === 'true') return 'dark';
  if (stored === 'false') return 'light';
  return null;
}

function systemDefault(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
}

export function useTheme(): {
  theme: Theme;
  storedTheme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
} {
  const [storedTheme, setThemeState] = useLocalStorage<Theme>(STORAGE_KEY, systemDefault, {
    parse: coerce,
    serialize: (t) => t,
  });
  const isPhone = useIsPhone();
  const theme: Theme = isPhone && storedTheme === 'mario' ? 'light' : storedTheme;

  useEffect(() => {
    apply(theme);
  }, [theme]);

  const set = useCallback((t: Theme) => setThemeState(t), [setThemeState]);
  const toggle = useCallback(
    () =>
      setThemeState((t: Theme) => CYCLE[(CYCLE.indexOf(t) + 1) % CYCLE.length] ?? 'light'),
    [setThemeState],
  );

  return { theme, storedTheme, toggle, set };
}
