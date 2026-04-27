import { useMemo } from 'react';
import { ArcadeProvider } from '../context/ArcadeContext';
import { Header } from '../components/layout/Header';
import { AnnouncementBanner } from '../components/leaderboard/AnnouncementBanner';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { Podium } from '../components/podium/Podium';
import { SkeletonBoard } from '../components/leaderboard/SkeletonBoard';
import { SkyStage } from '../components/mario/Clouds';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useSound } from '../hooks/useSound';
import { useSoundPref } from '../hooks/useSoundPref';
import { useTheme } from '../hooks/useTheme';
import { useViewCategory } from '../hooks/useViewCategory';
import { rankByCategory } from '../utils/rankByCategory';

const SOUND_FILES = {
  coin: '/src/assets/audio/coin.ogg',
  bounce: '/src/assets/audio/bounce.ogg',
} as const;

export function PublicDashboard() {
  const { data, updatedAt, loading, error, consecutiveErrors } = useLeaderboard();
  const { theme, set: setTheme } = useTheme();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundPref();
  const play = useSound({ sounds: SOUND_FILES, enabled: soundEnabled && theme === 'mario' });
  const [category, setCategory] = useViewCategory();

  const viewTeams = useMemo(
    () => (data ? rankByCategory(data.teams, category) : []),
    [data, category],
  );

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
      <div className="h-screen overflow-hidden flex flex-col bg-surface-off dark:bg-dark-page relative">
        {theme === 'mario' && <SkyStage />}
        <Header
          updatedAt={updatedAt}
          theme={theme}
          onSetTheme={setTheme}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          rightSlot={
            <a
              href="/admin"
              aria-label="Open admin panel"
              className={
                theme === 'mario'
                  ? 'pixel-btn pixel-btn-green'
                  : 'px-3 py-1.5 rounded-standard bg-brand-green text-white text-sm font-medium hover:opacity-90'
              }
              style={
                theme === 'mario'
                  ? { padding: '4px 10px', fontSize: '9px', borderWidth: '2px' }
                  : undefined
              }
            >
              {theme === 'mario' ? 'ADMIN' : 'Admin'}
            </a>
          }
        />

        <main className="relative z-10 flex-1 min-h-0 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 2xl:px-10 py-3 sm:py-4 2xl:py-6 flex flex-col">
          <AnnouncementBanner theme={theme} />

          {error && consecutiveErrors >= 3 && (
            <div className="mb-6 rounded-standard border border-semantic-warning bg-[#fef5e5] dark:bg-[#3a2e14] text-ink-black dark:text-dark-text px-4 py-3 text-sm">
              Connection issue — showing last known standings.
            </div>
          )}

          {loading && !data && <SkeletonBoard />}

          {data?.phase === 'pre' && (
            <div className="rounded-comfy border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card shadow-lvl-1 p-10 text-center">
              <h2 className="text-page-title text-ink-black dark:text-dark-text">
                The Green Gauntlet begins soon
              </h2>
              <p className="mt-2 text-ink-charcoal dark:text-dark-mid">
                Event starts at{' '}
                <strong>
                  {new Date(data.eventWindow.startAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </strong>
              </p>
            </div>
          )}

          {data?.phase === 'ended' && (
            <div className="mb-6 rounded-standard border border-brand-green bg-brand-mint dark:bg-[#1f3a2d] text-ink-black dark:text-dark-text px-4 py-3">
              <strong>Event ended</strong>{' '}
              {new Date(data.eventWindow.endAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}{' '}
              — final standings.
            </div>
          )}

          {data && data.phase !== 'pre' && data.teams.length > 0 && (
            <>
              <Podium top={viewTeams.slice(0, 3)} category={category} />
              <div className={`${theme === 'mario' ? '' : 'pt-6'} flex-1 min-h-0 flex flex-col`}>
                <Leaderboard teams={viewTeams} category={category} onCategoryChange={setCategory} />
              </div>
            </>
          )}
        </main>
      </div>
    </ArcadeProvider>
  );
}
