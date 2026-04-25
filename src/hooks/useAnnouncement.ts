import { useCallback, useEffect, useState } from 'react';
import { fetchAnnouncement, type PublicAnnouncement } from '../api/client';

const DISMISS_KEY = 'gg.announcement.dismissed';

function readDismissedId(): string | null {
  try {
    return window.localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

function writeDismissedId(id: string | null): void {
  try {
    if (id === null) window.localStorage.removeItem(DISMISS_KEY);
    else window.localStorage.setItem(DISMISS_KEY, id);
  } catch {
    /* ignore */
  }
}

export function useAnnouncement(): {
  message: string | null;
  messageId: string | null;
  isDismissed: boolean;
  dismiss: () => void;
} {
  const [data, setData] = useState<PublicAnnouncement | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(() => readDismissedId());

  const load = useCallback(async (signal?: AbortSignal): Promise<void> => {
    try {
      const next = await fetchAnnouncement(signal);
      setData(next);
    } catch {
      /* keep previous state */
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/leaderboard/stream');
      es.addEventListener('leaderboard-updated', () => {
        void load();
      });
    } catch {
      /* SSE unsupported — initial load + admin actions still work */
    }
    return () => {
      es?.close();
    };
  }, [load]);

  const dismiss = useCallback((): void => {
    if (!data?.messageId) return;
    writeDismissedId(data.messageId);
    setDismissedId(data.messageId);
  }, [data?.messageId]);

  const message = data?.message ?? null;
  const messageId = data?.messageId ?? null;
  const isDismissed = messageId !== null && messageId === dismissedId;

  return { message, messageId, isDismissed, dismiss };
}
