import { useCallback, useEffect, useState } from 'react';
import { adminLogout, applyBonusBatch, listBonus, setTeamActive } from '../api/admin';
import type { AdminBonusTeam, BonusCategory } from '../types';
import { CATEGORIES } from '../pages/admin/AdminRow';
import { useInterval } from './useInterval';

const REFRESH_MS = 15_000;

export type DeltaMap = Record<string, Partial<Record<BonusCategory, string>>>;

type Options = { onLoggedOut: () => void };

export function useAdminBonus({ onLoggedOut }: Options) {
  const [teams, setTeams] = useState<AdminBonusTeam[]>([]);
  const [deltas, setDeltas] = useState<DeltaMap>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const body = await listBonus();
      setTeams(body.teams);
      setUpdatedAt(body.updatedAt);
    } catch (err) {
      if ((err as { status?: number }).status === 401) {
        onLoggedOut();
        return;
      }
      setError((err as Error).message);
    }
  }, [onLoggedOut]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useInterval(() => void refresh(), REFRESH_MS);

  const setDelta = useCallback(
    (teamId: string, category: BonusCategory, value: string): void => {
      setDeltas((prev) => ({
        ...prev,
        [teamId]: { ...prev[teamId], [category]: value },
      }));
    },
    [],
  );

  const apply = useCallback(async (): Promise<void> => {
    const updates = collectUpdates(deltas);
    if (updates.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await applyBonusBatch(updates);
      setDeltas({});
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [deltas, refresh]);

  const toggleActive = useCallback(
    async (teamId: string, active: boolean): Promise<void> => {
      setTeams((prev) => prev.map((t) => (t.teamId === teamId ? { ...t, active } : t)));
      try {
        await setTeamActive(teamId, active);
        await refresh();
      } catch (err) {
        setError((err as Error).message);
        void refresh();
      }
    },
    [refresh],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await adminLogout();
    } catch {
      /* ignore */
    }
    onLoggedOut();
  }, [onLoggedOut]);

  const pendingCount = countPending(deltas);

  return {
    teams,
    deltas,
    busy,
    error,
    updatedAt,
    pendingCount,
    setDelta,
    apply,
    toggleActive,
    logout,
  };
}

function collectUpdates(
  deltas: DeltaMap,
): { teamId: string; category: BonusCategory; delta: number }[] {
  const updates: { teamId: string; category: BonusCategory; delta: number }[] = [];
  for (const [teamId, perCategory] of Object.entries(deltas)) {
    for (const category of CATEGORIES) {
      const n = parseDelta(perCategory?.[category]);
      if (n !== null) updates.push({ teamId, category, delta: n });
    }
  }
  return updates;
}

function countPending(deltas: DeltaMap): number {
  let count = 0;
  for (const perCategory of Object.values(deltas)) {
    for (const category of CATEGORIES) {
      if (parseDelta(perCategory?.[category]) !== null) count += 1;
    }
  }
  return count;
}

function parseDelta(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n === 0) return null;
  return n;
}
