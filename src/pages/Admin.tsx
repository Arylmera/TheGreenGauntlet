import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  adminLogin,
  adminLogout,
  applyBonusBatch,
  listBonus,
  setTeamActive,
} from '../api/admin';
import type { AdminBonusTeam, BonusCategory } from '../types';
import { HamburgerMenu } from '../components/HamburgerMenu';
import { SkyStage } from '../components/mario/Clouds';
import { useTheme } from '../hooks/useTheme';

const REFRESH_MS = 15_000;

const CATEGORIES: readonly BonusCategory[] = ['mario', 'crokinole', 'helping'];
const CATEGORY_LABEL: Record<BonusCategory, string> = {
  mario: 'Mario',
  crokinole: 'Crokinole',
  helping: 'Helping',
};

type DeltaMap = Record<string, Partial<Record<BonusCategory, string>>>;

export function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const { theme, set: setTheme } = useTheme();

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

  const isMario = theme === 'mario';

  if (authed === null) {
    return (
      <div className="admin relative min-h-screen flex items-center justify-center bg-surface-off dark:bg-dark-page text-ink-mid dark:text-dark-dim">
        {isMario && <SkyStage />}
        <div className="absolute top-3 right-3 z-40">
          <HamburgerMenu theme={theme} onSetTheme={setTheme} />
        </div>
        <span className={isMario ? 'font-pixel text-white tight-px relative z-10' : ''}>Loading…</span>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin relative min-h-screen flex items-center justify-center bg-surface-off dark:bg-dark-page px-4">
        {isMario && <SkyStage />}
        <div className="absolute top-3 right-3 z-40">
          <HamburgerMenu theme={theme} onSetTheme={setTheme} />
        </div>
        <form
          onSubmit={onSubmit}
          className={
            isMario
              ? 'relative z-10 w-full max-w-sm scroll-panel p-6 space-y-4'
              : 'w-full max-w-sm bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line shadow-lvl-1 p-6 space-y-4'
          }
        >
          <h1 className={
            isMario
              ? 'font-pixel text-[color:var(--mario-ink)] text-[14px] tight-px'
              : 'text-xl font-semibold text-ink-black dark:text-dark-text'
          }>
            {isMario ? 'ADMIN · SIGN IN' : 'Admin sign-in'}
          </h1>
          <label className="block">
            <span className={
              isMario
                ? 'block font-pixel text-[10px] text-[color:var(--mario-ink)] mb-2 tight-px'
                : 'block text-sm text-ink-charcoal dark:text-dark-mid mb-1'
            }>
              {isMario ? 'PASSWORD' : 'Password'}
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loginBusy}
              className={
                isMario
                  ? 'pixel-input w-full'
                  : 'w-full px-3 py-2 rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-green'
              }
            />
          </label>
          {loginError && (
            <p className={isMario ? 'font-crt text-[color:var(--mario-brick)] text-base' : 'text-sm text-semantic-danger'} role="alert">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            disabled={loginBusy || password.length === 0}
            className={
              isMario
                ? 'pixel-btn pixel-btn-green w-full'
                : 'w-full px-4 py-2 rounded-standard bg-brand-green text-white font-medium disabled:opacity-60'
            }
          >
            {loginBusy ? (isMario ? 'SIGNING IN…' : 'Signing in…') : (isMario ? 'SIGN IN' : 'Sign in')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <AdminTable
      onLoggedOut={() => setAuthed(false)}
      theme={theme}
      onSetTheme={setTheme}
    />
  );
}

type AdminTableProps = {
  onLoggedOut: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
  onSetTheme: (t: ReturnType<typeof useTheme>['theme']) => void;
};

function AdminTable({ onLoggedOut, theme, onSetTheme }: AdminTableProps) {
  const isMario = theme === 'mario';
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
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const setDelta = (teamId: string, category: BonusCategory, value: string): void => {
    setDeltas((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [category]: value },
    }));
  };

  const onApply = async (): Promise<void> => {
    const updates: { teamId: string; category: BonusCategory; delta: number }[] = [];
    for (const [teamId, perCategory] of Object.entries(deltas)) {
      for (const category of CATEGORIES) {
        const raw = perCategory?.[category];
        if (!raw) continue;
        const trimmed = raw.trim();
        if (trimmed.length === 0) continue;
        const n = Number(trimmed);
        if (!Number.isInteger(n) || n === 0) continue;
        updates.push({ teamId, category, delta: n });
      }
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

  const pendingCount = countPending(deltas);

  return (
    <div className="admin relative min-h-screen bg-surface-off dark:bg-dark-page">
      {isMario && <SkyStage />}
      <header className={
        isMario
          ? 'relative z-40 px-4 sm:px-6 py-3 flex items-center justify-between'
          : 'relative z-40 bg-surface-white dark:bg-dark-card border-b border-line-light dark:border-dark-line px-4 sm:px-6 py-3 flex items-center justify-between'
      }>
        <div>
          <h1
            className={
              isMario
                ? 'font-pixel text-white text-[14px] sm:text-[16px] tight-px'
                : 'text-lg sm:text-xl font-semibold text-ink-black dark:text-dark-text'
            }
            style={
              isMario
                ? { textShadow: '-2px 0 #1a1a1a, 2px 0 #1a1a1a, 0 -2px #1a1a1a, 0 2px #1a1a1a, 0 3px 0 rgba(0,0,0,0.35)' }
                : undefined
            }
          >
            {isMario ? 'ADMIN · BONUS POINTS' : 'Admin — Bonus points'}
          </h1>
          {updatedAt && (
            <p className={isMario ? 'font-crt text-white text-base mt-1' : 'text-xs text-ink-mid dark:text-dark-dim'}>
              Last refresh {new Date(updatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <HamburgerMenu theme={theme} onSetTheme={onSetTheme} />
          <a
            href="/api/admin/export.csv"
            className={
              isMario
                ? 'pixel-btn pixel-btn-ghost'
                : 'px-3 py-2 rounded-standard border border-line-light dark:border-dark-line text-sm text-ink-black dark:text-dark-text hover:bg-surface-panel dark:hover:bg-dark-hover'
            }
          >
            {isMario ? 'EXPORT CSV' : 'Export CSV'}
          </a>
          <button
            type="button"
            onClick={() => void onLogout()}
            className={
              isMario
                ? 'pixel-btn pixel-btn-ghost'
                : 'px-3 py-2 rounded-standard border border-line-light dark:border-dark-line text-sm text-ink-black dark:text-dark-text hover:bg-surface-panel dark:hover:bg-dark-hover'
            }
          >
            {isMario ? 'LOG OUT' : 'Log out'}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6">
        <ApplyBar busy={busy} count={pendingCount} onApply={() => void onApply()} isMario={isMario} />

        {error && (
          <div
            role="alert"
            className={
              isMario
                ? 'my-3 rounded-[3px] border-[3px] border-[color:var(--mario-brick)] bg-[#fde8e8] text-[color:var(--mario-ink)] px-3 py-2 font-crt text-lg'
                : 'my-3 rounded-standard border border-semantic-danger bg-[#fde8e8] dark:bg-[#3a1414] text-ink-black dark:text-dark-text px-3 py-2 text-sm'
            }
          >
            {error}
          </div>
        )}

        <section className={
          isMario
            ? 'scroll-panel overflow-x-auto'
            : 'bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line shadow-lvl-1 overflow-x-auto'
        }>
          <table className="w-full min-w-[960px]">
            <thead>
              <tr
                className={
                  isMario
                    ? 'text-[color:var(--mario-ink)] text-left font-pixel text-[10px] tight-px'
                    : 'bg-surface-off dark:bg-dark-hover text-ink-black dark:text-dark-text text-left text-xs sm:text-sm font-semibold'
                }
                style={
                  isMario
                    ? { background: 'var(--mario-parchment-dark)', borderBottom: '4px solid var(--mario-ink)' }
                    : undefined
                }
              >
                <th className="px-3 py-2 sm:py-3">{isMario ? 'TEAM' : 'Team'}</th>
                <th className="px-3 py-2 sm:py-3 w-20 text-center">{isMario ? 'ACTIVE' : 'Active'}</th>
                <th className="px-3 py-2 sm:py-3 w-28 text-center whitespace-nowrap">{isMario ? 'IL RAW' : 'IL raw'}</th>
                <th className="px-3 py-2 sm:py-3 w-24 text-center whitespace-nowrap">{isMario ? 'MARIO' : 'Mario'}</th>
                <th className="px-3 py-2 sm:py-3 w-24 text-center whitespace-nowrap">{isMario ? 'CROKINOLE' : 'Crokinole'}</th>
                <th className="px-3 py-2 sm:py-3 w-24 text-center whitespace-nowrap">{isMario ? 'HELPING' : 'Helping'}</th>
                <th className="px-3 py-2 sm:py-3 w-28 text-right">{isMario ? 'Δ MARIO' : 'Δ Mario'}</th>
                <th className="px-3 py-2 sm:py-3 w-28 text-right">{isMario ? 'Δ CROKINOLE' : 'Δ Crokinole'}</th>
                <th className="px-3 py-2 sm:py-3 w-28 text-right">{isMario ? 'Δ HELPING' : 'Δ Helping'}</th>
                <th className="px-3 py-2 sm:py-3 w-24 text-right">{isMario ? 'TOTAL' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <AdminRow
                  key={t.teamId}
                  team={t}
                  deltas={deltas[t.teamId] ?? {}}
                  onDeltaChange={(category, value) => setDelta(t.teamId, category, value)}
                  onToggleActive={(active) => void onToggleActive(t.teamId, active)}
                  isMario={isMario}
                />
              ))}
              {teams.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className={
                      isMario
                        ? 'px-4 py-6 text-center font-crt text-lg text-[color:var(--mario-ink-soft)]'
                        : 'px-4 py-6 text-center text-ink-mid dark:text-dark-dim text-sm'
                    }
                  >
                    {isMario ? 'NO TEAMS YET — WAITING FOR AGGREGATOR…' : 'No teams yet — waiting for first aggregator tick.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <ApplyBar busy={busy} count={pendingCount} onApply={() => void onApply()} isMario={isMario} />
      </main>
    </div>
  );
}

function countPending(deltas: DeltaMap): number {
  let count = 0;
  for (const perCategory of Object.values(deltas)) {
    if (!perCategory) continue;
    for (const category of CATEGORIES) {
      const raw = perCategory[category];
      if (!raw) continue;
      const trimmed = raw.trim();
      if (trimmed.length === 0) continue;
      const n = Number(trimmed);
      if (Number.isInteger(n) && n !== 0) count += 1;
    }
  }
  return count;
}

type RowProps = {
  team: AdminBonusTeam;
  deltas: Partial<Record<BonusCategory, string>>;
  onDeltaChange: (category: BonusCategory, value: string) => void;
  onToggleActive: (active: boolean) => void;
  isMario: boolean;
};

function AdminRow({ team, deltas, onDeltaChange, onToggleActive, isMario }: RowProps) {
  const dimmed = team.active ? '' : 'opacity-50';
  const rowCls = isMario
    ? `scroll-row ${dimmed}`
    : `border-b border-line-light dark:border-dark-line ${dimmed}`;
  const nameCls = isMario
    ? 'px-3 py-2 sm:py-3 font-pixel text-[11px] text-[color:var(--mario-ink)] tight-px'
    : 'px-3 py-2 sm:py-3 text-ink-black dark:text-dark-text font-medium text-sm sm:text-base';
  const numCls = isMario
    ? 'px-3 py-2 sm:py-3 text-center num text-xl text-[color:var(--mario-ink)]'
    : 'px-3 py-2 sm:py-3 text-center tabular text-sm';
  const totalCls = isMario
    ? 'px-3 py-2 sm:py-3 text-right num text-2xl font-bold text-[color:var(--mario-ink)]'
    : 'px-3 py-2 sm:py-3 text-right tabular font-bold text-sm sm:text-base text-ink-black dark:text-dark-text';
  const inputCls = isMario
    ? 'pixel-input w-24 text-right'
    : 'w-24 px-2 py-1 text-right rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-green';

  return (
    <tr className={rowCls}>
      <td className={nameCls}>{team.teamName}</td>
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
      <td className={numCls}>{team.immersivelab_points.toLocaleString('en-US')}</td>
      <td className={numCls}>{team.mario_points.toLocaleString('en-US')}</td>
      <td className={numCls}>{team.crokinole_points.toLocaleString('en-US')}</td>
      <td className={numCls}>{team.helping_points.toLocaleString('en-US')}</td>
      {CATEGORIES.map((category) => (
        <td key={category} className="px-3 py-2 sm:py-3 text-right">
          <input
            type="number"
            inputMode="numeric"
            value={deltas[category] ?? ''}
            onChange={(e) => onDeltaChange(category, e.target.value)}
            placeholder="0"
            aria-label={`Delta ${CATEGORY_LABEL[category]} for ${team.teamName}`}
            className={inputCls}
          />
        </td>
      ))}
      <td className={totalCls}>{team.total.toLocaleString('en-US')}</td>
    </tr>
  );
}

type ApplyBarProps = { busy: boolean; count: number; onApply: () => void; isMario: boolean };

function ApplyBar({ busy, count, onApply, isMario }: ApplyBarProps) {
  return (
    <div className="my-3 flex items-center justify-end gap-3">
      <span className={
        isMario
          ? 'font-crt text-lg text-white'
          : 'text-sm text-ink-mid dark:text-dark-dim'
      }
      style={isMario ? { textShadow: '0 2px 0 rgba(0,0,0,0.35)' } : undefined}
      >
        {count === 0
          ? (isMario ? 'NO PENDING CHANGES' : 'No pending changes')
          : (isMario ? `${count} PENDING` : `${count} pending`)}
      </span>
      <button
        type="button"
        onClick={onApply}
        disabled={busy || count === 0}
        className={
          isMario
            ? 'pixel-btn pixel-btn-green'
            : 'px-4 py-2 rounded-standard bg-brand-green text-white font-medium disabled:opacity-60'
        }
      >
        {busy ? (isMario ? 'APPLYING…' : 'Applying…') : (isMario ? 'APPLY' : 'Apply')}
      </button>
    </div>
  );
}
