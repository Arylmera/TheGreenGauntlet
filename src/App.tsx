import { useMemo } from 'react';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useTheme } from './hooks/useTheme';
import { useSoundPref } from './hooks/useSoundPref';
import { useSound } from './hooks/useSound';
import { ArcadeProvider } from './context/ArcadeContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Podium } from './components/Podium';
import { Leaderboard } from './components/Leaderboard';
import { AdminPage } from './pages/Admin';
import type { Team } from './types';

const SOUND_FILES = {
  coin: '/src/assets/audio/coin.ogg',
  bounce: '/src/assets/audio/bounce.ogg',
} as const;

export function App() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return <AdminPage />;
  }
  return <PublicDashboard />;
}

function PublicDashboard() {
  const { data, updatedAt, loading, error, consecutiveErrors } = useLeaderboard();
  const { theme, set: setTheme } = useTheme();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundPref();
  const play = useSound({ sounds: SOUND_FILES, enabled: soundEnabled && theme === 'mario' });

  const arcadeValue = useMemo(
    () => ({
      theme,
      soundEnabled,
      playCoin: () => play('coin'),
      playBounce: () => play('bounce'),
    }),
    [theme, soundEnabled, play],
  );

  return (
    <ArcadeProvider value={arcadeValue}>
      <div className="min-h-screen flex flex-col bg-surface-off dark:bg-dark-page">
        <Header
          updatedAt={updatedAt}
          theme={theme}
          onSetTheme={setTheme}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
        />

        <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 2xl:px-10 py-4 sm:py-6 2xl:py-8">
          {error && consecutiveErrors >= 3 && (
            <div className="mb-6 rounded-standard border border-semantic-warning bg-[#fef5e5] dark:bg-[#3a2e14] text-ink-black dark:text-dark-text px-4 py-3 text-sm">
              Connection issue — showing last known standings.
            </div>
          )}

          {loading && !data && <SkeletonBoard />}

          {data?.phase === 'pre' && (
            <div className="rounded-comfy border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card shadow-lvl-1 p-10 text-center">
              <h2 className="text-page-title text-ink-black dark:text-dark-text">The Green Gauntlet begins soon</h2>
              <p className="mt-2 text-ink-charcoal dark:text-dark-mid">
                Event starts at{' '}
                <strong>{new Date(data.eventWindow.startAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
              </p>
            </div>
          )}

          {data?.phase === 'ended' && (
            <div className="mb-6 rounded-standard border border-brand-green bg-brand-mint dark:bg-[#1f3a2d] text-ink-black dark:text-dark-text px-4 py-3">
              <strong>Event ended</strong>{' '}
              {new Date(data.eventWindow.endAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} — final standings.
            </div>
          )}

          {data && data.phase !== 'pre' && data.teams.length > 0 && (
            <>
              <Podium top={data.teams.slice(0, 3)} />
              <div className="mario-land-zone -mx-3 sm:-mx-6 2xl:-mx-10 px-3 sm:px-6 2xl:px-10 pt-6 pb-10 flex-1">
                <Leaderboard teams={data.teams} />
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </ArcadeProvider>
  );
}

function SkeletonBoard() {
  const rows: Team[] = [];
  return (
    <div className="animate-pulse">
      <div className="flex items-end justify-center gap-6 mb-10">
        {[2, 1, 3].map((i) => (
          <div key={i} className="bg-surface-white dark:bg-dark-card border border-line-light dark:border-dark-line rounded-comfy w-56 h-44" />
        ))}
      </div>
      <div className="bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-line-light dark:border-dark-line last:border-b-0" />
        ))}
      </div>
      {rows.length}
    </div>
  );
}
