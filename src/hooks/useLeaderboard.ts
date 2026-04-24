import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLeaderboard } from '../api/client';
import type { LeaderboardPayload } from '../types';
import { exponentialBackoff } from '../utils/backoff';
import { usePageVisible } from './usePageVisible';

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

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  usePageVisible(load);

  // Subscribe to server-sent `leaderboard-updated` events for near-instant refresh.
  // Events carry the full payload, so we apply it directly and avoid a redundant GET.
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/leaderboard/stream');
      es.addEventListener('leaderboard-updated', (ev) => {
        const raw = (ev as MessageEvent).data;
        try {
          const payload = JSON.parse(raw) as LeaderboardPayload;
          if (payload && Array.isArray(payload.teams) && typeof payload.updatedAt === 'string') {
            abortRef.current?.abort();
            setState((s) => ({
              ...s,
              data: payload,
              updatedAt: payload.updatedAt,
              loading: false,
              error: null,
              consecutiveErrors: 0,
            }));
            return;
          }
        } catch {
          // Fall through to re-fetch.
        }
        void load();
      });
    } catch {
      // SSE unsupported or blocked — 30 s poll below is the fallback.
    }
    return () => {
      es?.close();
    };
  }, [load]);

  useEffect(() => {
    if (state.loading) return;
    const delay = state.error
      ? exponentialBackoff(POLL_MS, state.consecutiveErrors, MAX_BACKOFF_MS)
      : POLL_MS;
    const id = window.setTimeout(() => {
      if (!document.hidden) void load();
    }, delay);
    return () => window.clearTimeout(id);
  }, [state.loading, state.error, state.consecutiveErrors, load]);

  return { ...state, refresh: () => void load() };
}
