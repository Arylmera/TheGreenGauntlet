const SKELETON_PODIUM_SLOTS = ['podium-2nd', 'podium-1st', 'podium-3rd'] as const;
const SKELETON_ROW_KEYS = Array.from({ length: 30 }, (_, i) => `skeleton-row-${i}`);

export function SkeletonBoard() {
  return (
    <div className="animate-pulse" aria-label="Loading leaderboard" aria-busy="true">
      <div className="flex items-end justify-center gap-6 mb-10">
        {SKELETON_PODIUM_SLOTS.map((slot) => (
          <div
            key={slot}
            className="bg-surface-white dark:bg-dark-card border border-line-light dark:border-dark-line rounded-comfy w-56 h-44"
          />
        ))}
      </div>
      <div className="bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line">
        {SKELETON_ROW_KEYS.map((key) => (
          <div
            key={key}
            className="h-14 border-b border-line-light dark:border-dark-line last:border-b-0"
          />
        ))}
      </div>
    </div>
  );
}
