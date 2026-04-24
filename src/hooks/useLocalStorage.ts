import { useCallback, useEffect, useState } from 'react';

type Options<T> = {
  parse?: (raw: string | null) => T | null;
  serialize?: (value: T) => string;
};

export function useLocalStorage<T>(
  key: string,
  defaultValue: T | (() => T),
  options: Options<T> = {},
): [T, (value: T | ((prev: T) => T)) => void] {
  const { parse, serialize } = options;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (parse) {
        const parsed = parse(raw);
        if (parsed !== null) return parsed;
      } else if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // ignore — storage blocked or unparseable
    }
    return typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
  });

  useEffect(() => {
    try {
      const encoded = serialize ? serialize(value) : JSON.stringify(value);
      window.localStorage.setItem(key, encoded);
    } catch {
      // ignore
    }
  }, [key, value, serialize]);

  const update = useCallback((next: T | ((prev: T) => T)) => setValue(next), []);
  return [value, update];
}
