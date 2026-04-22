# React + Vite

- Function components only. No class components.
- Hooks: custom hooks own data-fetching + polling; components stay presentational.
- Polling: `AbortController` on unmount; pause on `document.hidden`.
- No default exports — named exports only (grep-friendly, rename-safe).
- Keep components under ~150 lines. Split when a file grows a second concern.
- Props typed explicitly. No `React.FC` (implicit children is a footgun).
- No global state library until proven necessary. Lift state or use context.
- `key` must be stable (uuid), never array index for reordering lists (leaderboard rows reorder).
- `clamp()` for typography, not fixed px. See [styling.md](styling.md).
