import { createContext, useContext, type PropsWithChildren } from 'react';
import type { Theme } from '../hooks/useTheme';

export type ArcadeValue = {
  theme: Theme;
  soundEnabled: boolean;
  playCoin: () => void;
  playBounce: () => void;
};

const DEFAULT: ArcadeValue = {
  theme: 'light',
  soundEnabled: false,
  playCoin: () => undefined,
  playBounce: () => undefined,
};

const Ctx = createContext<ArcadeValue>(DEFAULT);

export function ArcadeProvider({ value, children }: PropsWithChildren<{ value: ArcadeValue }>) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useArcade(): ArcadeValue {
  return useContext(Ctx);
}
