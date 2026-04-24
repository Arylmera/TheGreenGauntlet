import { useCallback, useEffect, useRef } from 'react';

type SoundMap = Record<string, string>;

type Options = {
  sounds: SoundMap;
  enabled: boolean;
  volume?: number;
};

/**
 * Lazy pooled audio. Does nothing when `enabled` is false.
 * First call after mount warms the cache; subsequent calls clone the node
 * so rapid triggers don't cut each other off.
 */
export function useSound({ sounds, enabled, volume = 0.4 }: Options) {
  const cache = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    for (const [key, src] of Object.entries(sounds)) {
      if (cache.current.has(key)) continue;
      try {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = volume;
        cache.current.set(key, audio);
      } catch {
        // ignore — audio blocked
      }
    }
  }, [enabled, sounds, volume]);

  return useCallback(
    (key: string) => {
      if (!enabled) return;
      const base = cache.current.get(key);
      if (!base) return;
      try {
        const node = base.cloneNode(true) as HTMLAudioElement;
        node.volume = volume;
        void node.play().catch(() => {
          // autoplay blocked — silent
        });
      } catch {
        // ignore
      }
    },
    [enabled, volume],
  );
}
