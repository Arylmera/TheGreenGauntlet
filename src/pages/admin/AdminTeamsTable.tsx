import { useMemo, useState } from 'react';
import { SkyStage } from '../../components/mario/Clouds';
import { useAdminBonus } from '../../hooks/useAdminBonus';
import type { Theme } from '../../hooks/useTheme';
import { AdminEmptyRow } from './AdminEmptyRow';
import { AdminHeader } from './AdminHeader';
import { AdminRow } from './AdminRow';
import { AdminSearchBar } from './AdminSearchBar';
import { AdminTableHead } from './AdminTableHead';
import { AnnouncementPanel } from './AnnouncementPanel';
import { ApplyBar } from './ApplyBar';

type Props = {
  onLoggedOut: () => void;
  theme: Theme;
  onSetTheme: (t: Theme) => void;
};

export function AdminTeamsTable({ onLoggedOut, theme, onSetTheme }: Props) {
  const isMario = theme === 'mario';
  const {
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
  } = useAdminBonus({ onLoggedOut });

  const [query, setQuery] = useState('');
  const visibleTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? teams.filter((t) => t.teamName.toLowerCase().includes(q)) : teams;
  }, [teams, query]);

  const onApply = () => void apply();

  return (
    <div className="admin relative min-h-screen bg-surface-off dark:bg-dark-page">
      {isMario && <SkyStage />}
      <AdminHeader
        isMario={isMario}
        updatedAt={updatedAt}
        theme={theme}
        onSetTheme={onSetTheme}
        onLogout={() => void logout()}
      />

      <main className="relative z-10 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6">
        <AnnouncementPanel isMario={isMario} onUnauthorized={onLoggedOut} />

        <div className="my-3 flex items-center justify-between gap-3 flex-wrap">
          <AdminSearchBar isMario={isMario} value={query} onChange={setQuery} />
          <ApplyBar busy={busy} count={pendingCount} onApply={onApply} isMario={isMario} />
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
            <AdminTableHead isMario={isMario} />
            <tbody>
              {visibleTeams.map((t) => (
                <AdminRow
                  key={t.teamId}
                  team={t}
                  deltas={deltas[t.teamId] ?? {}}
                  onDeltaChange={(category, value) => setDelta(t.teamId, category, value)}
                  onToggleActive={(active) => void toggleActive(t.teamId, active)}
                  isMario={isMario}
                />
              ))}
              {visibleTeams.length === 0 && (
                <AdminEmptyRow isMario={isMario} searching={query.trim().length > 0} />
              )}
            </tbody>
          </table>
        </section>

        <ApplyBar busy={busy} count={pendingCount} onApply={onApply} isMario={isMario} />
      </main>
    </div>
  );
}
