import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLeaderboard } from '../api/client';
import type { LeaderboardPayload } from '../types';

const POLL_MS = 30_000;
const MAX_BACKOFF_MS = 120_000;

type State = {
  data: LeaderboardPayload | null;
  updatedAt: string | null;
  loading: boolean;
  error: Error | null;
  consecutiveErrors: number;
};

export function useLeaderboard(): State & { refresh: () => void } {
  const [state, setState] = useState<State>({
    data: null,
    updatedAt: null,
    loading: true,
    error: null,
    consecutiveErrors: 0,
  });

  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const payload = await fetchLeaderboard(ctrl.signal);
      setState((s) => ({
        ...s,
        data: payload,
        updatedAt: payload.updatedAt,
        loading: false,
        error: null,
        consecutiveErrors: 0,
      }));
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
        consecutiveErrors: s.consecutiveErrors + 1,
      }));
    }
  }, []);

  const schedule = useCallback((delay: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (!document.hidden) void load();
    }, delay);
  }, [load]);

  useEffect(() => {
    void load();
    const onVisibility = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      abortRef.current?.abort();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (state.loading) return;
    const delay = state.error
      ? Math.min(POLL_MS * 2 ** (state.consecutiveErrors - 1), MAX_BACKOFF_MS)
      : POLL_MS;
    schedule(delay);
  }, [state.loading, state.error, state.consecutiveErrors, schedule]);

  return { ...state, refresh: () => void load() };
}
