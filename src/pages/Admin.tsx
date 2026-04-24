import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  adminLogin,
  adminLogout,
  applyBonusBatch,
  listBonus,
  setTeamActive,
} from '../api/admin';
import type { AdminBonusTeam } from '../types';

const REFRESH_MS = 15_000;

export function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const tryList = useCallback(async (): Promise<boolean> => {
    try {
      await listBonus();
      return true;
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) return false;
      throw err;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void tryList().then((ok) => {
      if (!cancelled) setAuthed(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [tryList]);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      await adminLogin(password);
      setPassword('');
      setAuthed(true);
    } catch (err) {
      setLoginError((err as Error).message || 'Login failed');
    } finally {
      setLoginBusy(false);
    }
  };

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-off dark:bg-dark-page text-ink-mid dark:text-dark-dim">
        Loading…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-off dark:bg-dark-page px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line shadow-lvl-1 p-6 space-y-4"
        >
          <h1 className="text-xl font-semibold text-ink-black dark:text-dark-text">
            Admin sign-in
          </h1>
          <label className="block">
            <span className="block text-sm text-ink-charcoal dark:text-dark-mid mb-1">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loginBusy}
              className="w-full px-3 py-2 rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </label>
          {loginError && (
            <p className="text-sm text-semantic-danger" role="alert">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            disabled={loginBusy || password.length === 0}
            className="w-full px-4 py-2 rounded-standard bg-brand-green text-white font-medium disabled:opacity-60"
          >
            {loginBusy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return <AdminTable onLoggedOut={() => setAuthed(false)} />;
}

type AdminTableProps = { onLoggedOut: () => void };

function AdminTable({ onLoggedOut }: AdminTableProps) {
  const [teams, setTeams] = useState<AdminBonusTeam[]>([]);
  const [deltas, setDeltas] = useState<Record<string, string>>({});
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
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const onApply = async (): Promise<void> => {
    const updates: { teamId: string; delta: number }[] = [];
    for (const [teamId, raw] of Object.entries(deltas)) {
      const trimmed = raw.trim();
      if (trimmed.length === 0) continue;
      const n = Number(trimmed);
      if (!Number.isInteger(n) || n === 0) continue;
      updates.push({ teamId, delta: n });
    }
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
  };

  const onToggleActive = async (teamId: string, active: boolean): Promise<void> => {
    // optimistic
    setTeams((prev) => prev.map((t) => (t.teamId === teamId ? { ...t, active } : t)));
    try {
      await setTeamActive(teamId, active);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
      void refresh();
    }
  };

  const onLogout = async (): Promise<void> => {
    try {
      await adminLogout();
    } catch {
      /* ignore */
    }
    onLoggedOut();
  };

  const pendingCount = Object.values(deltas).filter((v) => {
    const n = Number(v.trim());
    return v.trim().length > 0 && Number.isInteger(n) && n !== 0;
  }).length;

  return (
    <div className="min-h-screen bg-surface-off dark:bg-dark-page">
      <header className="bg-surface-white dark:bg-dark-card border-b border-line-light dark:border-dark-line px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-ink-black dark:text-dark-text">
            Admin — Bonus points
          </h1>
          {updatedAt && (
            <p className="text-xs text-ink-mid dark:text-dark-dim">
              Last refresh {new Date(updatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/export.csv"
            className="px-3 py-2 rounded-standard border border-line-light dark:border-dark-line text-sm text-ink-black dark:text-dark-text hover:bg-surface-panel dark:hover:bg-dark-hover"
          >
            Export CSV
          </a>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="px-3 py-2 rounded-standard border border-line-light dark:border-dark-line text-sm text-ink-black dark:text-dark-text hover:bg-surface-panel dark:hover:bg-dark-hover"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6">
        <ApplyBar busy={busy} count={pendingCount} onApply={() => void onApply()} />

        {error && (
          <div
            role="alert"
            className="my-3 rounded-standard border border-semantic-danger bg-[#fde8e8] dark:bg-[#3a1414] text-ink-black dark:text-dark-text px-3 py-2 text-sm"
          >
            {error}
          </div>
        )}

        <section className="bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line shadow-lvl-1 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-off dark:bg-dark-hover text-ink-black dark:text-dark-text text-left text-xs sm:text-sm font-semibold">
                <th className="px-3 py-2 sm:py-3">Team</th>
                <th className="px-3 py-2 sm:py-3 w-20 text-center">Active</th>
                <th className="px-3 py-2 sm:py-3 w-36 text-center whitespace-nowrap">Immersive Lab</th>
                <th className="px-3 py-2 sm:py-3 w-28 text-center whitespace-nowrap">Bonus total</th>
                <th className="px-3 py-2 sm:py-3 w-28 text-right">Delta</th>
                <th className="px-3 py-2 sm:py-3 w-24 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <AdminRow
                  key={t.teamId}
                  team={t}
                  delta={deltas[t.teamId] ?? ''}
                  onDeltaChange={(v) =>
                    setDeltas((prev) => ({ ...prev, [t.teamId]: v }))
                  }
                  onToggleActive={(active) => void onToggleActive(t.teamId, active)}
                />
              ))}
              {teams.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-ink-mid dark:text-dark-dim text-sm"
                  >
                    No teams yet — waiting for first aggregator tick.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <ApplyBar busy={busy} count={pendingCount} onApply={() => void onApply()} />
      </main>
    </div>
  );
}

type RowProps = {
  team: AdminBonusTeam;
  delta: string;
  onDeltaChange: (v: string) => void;
  onToggleActive: (active: boolean) => void;
};

function AdminRow({ team, delta, onDeltaChange, onToggleActive }: RowProps) {
  const dimmed = team.active ? '' : 'opacity-50';
  return (
    <tr className={`border-b border-line-light dark:border-dark-line ${dimmed}`}>
      <td className="px-3 py-2 sm:py-3 text-ink-black dark:text-dark-text font-medium text-sm sm:text-base">
        {team.teamName}
      </td>
      <td className="px-3 py-2 sm:py-3 text-center">
        <label className="inline-flex items-center cursor-pointer align-middle">
          <input
            type="checkbox"
            checked={team.active}
            onChange={(e) => onToggleActive(e.target.checked)}
            aria-label={`Active ${team.teamName}`}
            className="sr-only peer"
          />
          <span
            className="relative w-10 h-5 rounded-full bg-line-light dark:bg-dark-line transition-colors peer-checked:bg-brand-green peer-focus-visible:ring-2 peer-focus-visible:ring-brand-green peer-focus-visible:ring-offset-2 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
          />
        </label>
      </td>
      <td className="px-3 py-2 sm:py-3 text-center tabular text-sm">
        {team.il_points.toLocaleString('en-US')}
      </td>
      <td className="px-3 py-2 sm:py-3 text-center tabular text-sm">
        {team.bonus_points.toLocaleString('en-US')}
      </td>
      <td className="px-3 py-2 sm:py-3 text-right">
        <input
          type="number"
          inputMode="numeric"
          value={delta}
          onChange={(e) => onDeltaChange(e.target.value)}
          placeholder="0"
          aria-label={`Delta for ${team.teamName}`}
          className="w-24 px-2 py-1 text-right rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
      </td>
      <td className="px-3 py-2 sm:py-3 text-right tabular font-bold text-sm sm:text-base text-ink-black dark:text-dark-text">
        {team.total.toLocaleString('en-US')}
      </td>
    </tr>
  );
}

type ApplyBarProps = { busy: boolean; count: number; onApply: () => void };

function ApplyBar({ busy, count, onApply }: ApplyBarProps) {
  return (
    <div className="my-3 flex items-center justify-end gap-3">
      <span className="text-sm text-ink-mid dark:text-dark-dim">
        {count === 0 ? 'No pending changes' : `${count} pending`}
      </span>
      <button
        type="button"
        onClick={onApply}
        disabled={busy || count === 0}
        className="px-4 py-2 rounded-standard bg-brand-green text-white font-medium disabled:opacity-60"
      >
        {busy ? 'Applying…' : 'Apply'}
      </button>
    </div>
  );
}
