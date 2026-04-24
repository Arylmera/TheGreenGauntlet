import { useCallback, useEffect, useState } from 'react';
import { adminLogout, applyBonusBatch, listBonus, setTeamActive } from '../../api/admin';
import type { AdminBonusTeam, BonusCategory } from '../../types';
import { HamburgerMenu } from '../../components/HamburgerMenu';
import { SkyStage } from '../../components/mario/Clouds';
import type { Theme } from '../../hooks/useTheme';
import { AdminRow, CATEGORIES } from './AdminRow';
import { ApplyBar } from './ApplyBar';

const REFRESH_MS = 15_000;

type DeltaMap = Record<string, Partial<Record<BonusCategory, string>>>;

type Props = {
  onLoggedOut: () => void;
  theme: Theme;
  onSetTheme: (t: Theme) => void;
};

export function AdminTeamsTable({ onLoggedOut, theme, onSetTheme }: Props) {
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

  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visibleTeams = q ? teams.filter((t) => t.teamName.toLowerCase().includes(q)) : teams;

  const pendingCount = countPending(deltas);

  return (
    <div className="admin relative min-h-screen bg-surface-off dark:bg-dark-page">
      {isMario && <SkyStage />}
      <header
        className={
          isMario
            ? 'relative z-40 px-4 sm:px-6 py-3 flex items-center justify-between'
            : 'relative z-40 bg-surface-white dark:bg-dark-card border-b border-line-light dark:border-dark-line px-4 sm:px-6 py-3 flex items-center justify-between'
        }
      >
        <div>
          <h1
            className={
              isMario
                ? 'font-pixel text-white text-[14px] sm:text-[16px] tight-px'
                : 'text-lg sm:text-xl font-semibold text-ink-black dark:text-dark-text'
            }
            style={
              isMario
                ? {
                    textShadow:
                      '-2px 0 #1a1a1a, 2px 0 #1a1a1a, 0 -2px #1a1a1a, 0 2px #1a1a1a, 0 3px 0 rgba(0,0,0,0.35)',
                  }
                : undefined
            }
          >
            {isMario ? 'ADMIN · BONUS POINTS' : 'Admin — Bonus points'}
          </h1>
          {updatedAt && (
            <p
              className={
                isMario
                  ? 'font-crt text-white text-base mt-1'
                  : 'text-xs text-ink-mid dark:text-dark-dim'
              }
            >
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
        <div className="my-3 flex items-center justify-between gap-3 flex-wrap">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isMario ? 'SEARCH TEAM…' : 'Search team…'}
            className={
              isMario
                ? 'pixel-input w-full sm:w-56'
                : 'w-full sm:max-w-xs px-3 py-2 rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text text-sm placeholder:text-ink-mid dark:placeholder:text-dark-dim focus:outline-none focus:ring-2 focus:ring-brand-green'
            }
          />
          <ApplyBar busy={busy} count={pendingCount} onApply={() => void onApply()} isMario={isMario} />
        </div>

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

        <section
          className={
            isMario
              ? 'scroll-panel overflow-x-auto'
              : 'bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line shadow-lvl-1 overflow-x-auto'
          }
        >
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
                    ? {
                        background: 'var(--mario-parchment-dark)',
                        borderBottom: '4px solid var(--mario-ink)',
                      }
                    : undefined
                }
              >
                <th className="px-3 py-2 sm:py-3">{isMario ? 'TEAM' : 'Team'}</th>
                <th className="px-3 py-2 sm:py-3 w-20 text-center">
                  {isMario ? 'ACTIVE' : 'Active'}
                </th>
                <th className="px-3 py-2 sm:py-3 w-28 text-center whitespace-nowrap">
                  Immersive Lab
                </th>
                <th className="px-3 py-2 sm:py-3 w-24 text-center whitespace-nowrap">
                  {isMario ? 'MARIO' : 'Mario'}
                </th>
                <th className="px-3 py-2 sm:py-3 w-24 text-center whitespace-nowrap">
                  {isMario ? 'CROKINOLE' : 'Crokinole'}
                </th>
                <th className="px-3 py-2 sm:py-3 w-24 text-center whitespace-nowrap">
                  {isMario ? 'HELPING' : 'Helping'}
                </th>
                <th className="px-3 py-2 sm:py-3 w-28 text-center">{isMario ? 'MARIO' : 'Mario'}</th>
                <th className="px-3 py-2 sm:py-3 w-28 text-center">
                  {isMario ? 'CROKINOLE' : 'Crokinole'}
                </th>
                <th className="px-3 py-2 sm:py-3 w-28 text-center">
                  {isMario ? 'HELPING' : 'Helping'}
                </th>
                <th className="px-3 py-2 sm:py-3 w-24 text-center">
                  {isMario ? 'TOTAL' : 'Total'}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleTeams.map((t) => (
                <AdminRow
                  key={t.teamId}
                  team={t}
                  deltas={deltas[t.teamId] ?? {}}
                  onDeltaChange={(category, value) => setDelta(t.teamId, category, value)}
                  onToggleActive={(active) => void onToggleActive(t.teamId, active)}
                  isMario={isMario}
                />
              ))}
              {visibleTeams.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className={
                      isMario
                        ? 'px-4 py-6 text-center font-crt text-lg text-[color:var(--mario-ink-soft)]'
                        : 'px-4 py-6 text-center text-ink-mid dark:text-dark-dim text-sm'
                    }
                  >
                    {q
                      ? isMario
                        ? 'NO MATCH'
                        : 'No teams match your search.'
                      : isMario
                        ? 'NO TEAMS YET — WAITING FOR AGGREGATOR…'
                        : 'No teams yet — waiting for first aggregator tick.'}
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
