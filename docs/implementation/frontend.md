# Frontend

Public React SPA. No auth UI. Polls `/api/leaderboard` every 30 s.

## Stack
- Vite + React + TypeScript.
- No state library. Local `useState` + a polling hook.

## Files
- `index.html`, `src/main.tsx`, `src/App.tsx`.
- `src/api/client.ts` — `fetchLeaderboard()` calling `/api/leaderboard`.
- `src/hooks/useLeaderboard.ts` — 30 s poll, pause on `document.hidden`, exponential backoff on error.
- `src/components/Leaderboard.tsx` — ranked account list.
- `src/components/AccountRow.tsx` — single row (rank, display name, points, optional time spent + completed count).
- `src/styles.css` or Tailwind (decide).

## Hook contract
```ts
useLeaderboard(): { data, updatedAt, loading, error, refresh }
```
- Initial fetch on mount.
- `setInterval(30_000)`; clear on unmount.
- `visibilitychange` → pause when hidden, refetch on visible.

## UX
- **Language: English only.** All copy hard-coded in EN. Set `<html lang="en">`. Use `Intl` formatters with explicit `"en-US"` locale (never default to browser locale) for dates, times, and numbers.
- Skeleton rows on first load.
- Subtle "updated Xs ago" label bound to `updatedAt`.
- **Phase-driven states** (from payload `phase`):
  - `"pre"` → "Event starts at {EVENT_START_AT}" placeholder, no rows.
  - `"live"` → normal ranked list.
  - `"ended"` → "Event ended {EVENT_END_AT} — final standings" banner, list frozen.
- Error banner on sustained failure (3 consecutive errors).

## Steps
1. Scaffold Vite app + TS config.
2. Implement `client.ts` with typed response.
3. Implement hook with polling + visibility + backoff.
4. Build `Leaderboard` composed of `AccountRow`.
5. Compose in `App.tsx` with header + footer.
6. Add dev proxy rule `/api → localhost:3000` in `vite.config.ts`.

## Verification
- Incognito load → leaderboard renders within first fetch.
- DevTools network: only same-origin `/api/*`. No ImmersiveLab domain. No secrets in JS bundle.
- Tab hidden 2 min → no polling. On focus → immediate fetch.
- Server down → backoff, error banner; recovers on return.
- Set `EVENT_START_AT` to future → UI shows "pre" state.
- Set `EVENT_END_AT` to past → UI shows "ended" banner, standings frozen.
