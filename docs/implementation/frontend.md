# Frontend

React SPA served by the Fastify process at `/`. Polls `/api/leaderboard` every 30 s **and** subscribes to `/api/leaderboard/stream` (SSE) for near-instant refresh on admin writes. A cookie-auth `/admin` page lives in the same bundle.

## Stack
- Vite + React + TypeScript + Tailwind.
- No state library. Local `useState` + polling/SSE hook + React context for theme and tab.

## Files (as shipped)
- `index.html`, `src/main.tsx`, `src/App.tsx`.
- `src/pages/PublicDashboard.tsx` — public leaderboard page composition.
- `src/pages/Admin.tsx` + `src/pages/admin/` — admin SPA (login form, teams table, search bar, apply bar, announcement panel, header).
- `src/api/client.ts` — `fetchLeaderboard()` calling `/api/leaderboard`.
- `src/hooks/useLeaderboard.ts` — 30 s poll **plus** `EventSource('/api/leaderboard/stream')` subscription; pause on `document.hidden`; exponential backoff on error.
- `src/hooks/useViewCategory.ts` — reads/writes `?view=total|il|mario|crokinole`.
- `src/hooks/useTheme.ts` — theme (light / dark / mario) context.
- `src/hooks/useSound.ts` + `src/hooks/useSoundPref.ts` — arcade sound effects + persisted preference.
- `src/hooks/useAdminAuth.ts`, `src/hooks/useAdminBonus.ts`, `src/hooks/useAnnouncement.ts` — admin/bonus/announcement state.
- `src/hooks/useFlashedTeams.ts`, `src/hooks/useRowAnimations.ts`, `src/hooks/useRankBounce.ts` — row-flash + FLIP reorder, suppressed on tab switch.
- `src/hooks/useDismissOnOutside.ts`, `src/hooks/useMenuArrowNav.ts`, `src/hooks/useInterval.ts`, `src/hooks/usePageVisible.ts`, `src/hooks/useLocalStorage.ts` — UI helpers.
- `src/utils/rankByCategory.ts` — pure re-ranker; tests in `rankByCategory.test.ts`.
- `src/components/leaderboard/` — `Leaderboard.tsx`, `LeaderboardTabs.tsx`, `LeaderboardTableHead.tsx`, `LeaderboardToolbar.tsx`, `TeamRow.tsx`, `TeamRow.mario.tsx`, `TeamAvatar.tsx`, `SkeletonBoard.tsx`, `AnnouncementBanner.tsx`.
- `src/components/podium/` — `Podium.tsx`, `PipeStep.tsx`, `PanelStep.tsx`, `podium.constants.ts` (points-proportional height, reused per tab).
- `src/components/menu/` — `HamburgerMenu.tsx`, `HamburgerMenu.icons.tsx`, `HamburgerMenu.styles.ts`, `ThemeMenuItem.tsx`, `SoundMenuItem.tsx`. Menu also cross-links between leaderboard and admin.
- `src/components/layout/` — `Header.tsx`, `Footer.tsx`.
- `src/components/mario/` — `Clouds.tsx`, `CoinIcon.tsx`, `MedalIcon.tsx` (arcade-only chrome).
- `src/components/UpdatedPill.tsx` — "Updated Xs ago" pill; arcade mode flips to `LIVE · HH:MM:SS` with a live dot.

## Hook contract
```ts
useLeaderboard(): { data, updatedAt, loading, error, consecutiveErrors, refresh }
```
- Initial fetch on mount.
- `setInterval(30_000)`; clear on unmount. Backoff (up to 120 s) on consecutive errors.
- `visibilitychange` → pause when hidden, refetch on visible.
- `new EventSource('/api/leaderboard/stream')` — on `leaderboard-updated` event, trigger `load()` immediately. SSE failure falls back silently to the 30 s poll.

## UX
- **Language: English only.** All copy hard-coded in EN. Set `<html lang="en">`. Use `Intl` formatters with explicit `"en-US"` locale (never default to browser locale) for dates, times, and numbers.
- Skeleton rows on first load.
- Subtle "updated Xs ago" label bound to `updatedAt`.
- **Phase-driven states** (from payload `phase`):
  - `"pre"` → "Event starts at {EVENT_START_AT}" placeholder, no rows.
  - `"live"` → normal ranked list.
  - `"ended"` → "Event ended {EVENT_END_AT} — final standings" banner, list frozen.
- Error banner on sustained failure (3 consecutive errors).

## Mockup decisions (resolved)

### Branding
- Product name: **The Green Gauntlet**.
- Header wordmark: **"The Green Gauntlet"**.
- Header subtitle: **"BNP Paribas Fortis DevOps Day · Live Standings"**.
- Logo: gauntlet-holding-shield-on-podium mark. Save asset at `src/assets/logo.png` (or `.svg` preferred). Placement: top-left of header per [../guidelines/DESIGN.md](../guidelines/DESIGN.md) nav spec.
- No countdown/timer in v1 (revisit later).

### Team row
- Avatar: single generic BNP icon, same for every team (no per-team avatar).
- Rank: numeric, left-aligned, tabular-nums, weight 700.
- Display name: from `Account.displayName`.
- Points: right-aligned, tabular-nums, weight 700. Top 3 use BNP Green (`#00915a`).
- `lastActivityAt`: **relative** ("2m ago", "just now"). Use a shared formatter with `en-US` locale and `Intl.RelativeTimeFormat`.
- Ties: sequential per aggregation rule — earlier `lastActivityAt` takes the higher slot (first-to-reach wins). No shared ranks.

### Top 3 — podium
- Visual podium above the ranked list: positions 2 · 1 · 3 (center = winner, elevated).
- Modern, minimal. No skeuomorphic medals. Medal chip = small circular token with 1/2/3 + gold (`#d4af37`) / silver (`#c0c0c0`) / bronze (`#cd7f32`) tint on the chip border; card body stays white per DESIGN.md.
- Winner card elevated by `Level 2` shadow; 2nd/3rd at `Level 1`.
- Shows the same logo avatar + team name + points, scaled up.
- **Points-proportional height:** rank 1 is always full height; rank 2/3 heights scale by `points / topPoints`, clamped to `[0.6, 1]`, so the delta vs. the leader is visible at a glance on the podium itself (not just the table). Ties with rank 1 match its height. When all three are still at 0 points (pre-activity), falls back to a fixed hierarchy (1.0 / 0.85 / 0.75). A responsive `min-h-*` floor per breakpoint guarantees medal, name, points, and last-activity timestamp always fit inside the card. Height changes animate over 300 ms.
- Below the podium: full 30-row leaderboard including ranks 1–3 again (consistency for scanning).

### Rank-change animation
- On successful poll refresh, animate row reordering (FLIP technique — measure pre, mutate DOM, animate transform deltas).
- Transition: ~400 ms ease-out.
- Rows whose `points` increased flash a Mint Highlight (`#d6ecdf`) background briefly (~800 ms fade).
- Respect `@media (prefers-reduced-motion: reduce)` → disable reorder animation and flash, do instant swap.

### Viewport priority
- **Primary target: TV (1920×1080, 10-foot viewing).**
  - Fixed layout, no scroll. Podium + full list fit one screen.
  - Row height ~72–88px; 30 rows must fit vertically.
  - Rank + points at `Numeric Large` (28px+) or Display scale; name at Section/Feature Heading scale.
  - High contrast. No hover-only affordances. No tooltips.
- **Secondary: desktop (1280–1920px).** Same layout, denser rows (56–64px), hover states enabled.
- **Tertiary: tablet / mobile.** Must not break. Stack / scroll per DESIGN.md collapsing strategy. Not a design focus.

### Header / footer
- Header: logo + wordmark (left), subtitle (under wordmark or right). "Updated Xs ago" pill on the right.
- Footer: minimal — event credit line ("BNP Paribas Fortis · DevOps Day"). No sponsors, no nav.

### Loading / empty / error
- First-load skeleton: 30 skeleton rows (shimmering light-gray blocks) + podium placeholder.
- `phase: "pre"` → centered placeholder card: "Event starts at {EVENT_START_AT}". No rows.
- `phase: "ended"` → banner above podium: "Event ended {EVENT_END_AT} — final standings". List frozen.
- Sustained error (3 consecutive poll failures) → amber banner at top, keep last known standings visible.

### Refresh indicator
- Top-right pill (`UpdatedPill.tsx`): "Updated Xs ago" bound to `updatedAt`; updates in place every second. In the Mario arcade theme the pill flips to `LIVE · HH:MM:SS` with a pulsing dot.
- No countdown progress bar. SSE push means the next refresh is near-instant on admin writes; the 30 s poll is a fallback, not something to visualise.

### Category tabs
- `LeaderboardTabs.tsx` renders four tabs: `Total` / `Immersive Lab` / `Mario` / `Crokinole`. Standard variant and Mario pixel variant (consumes `useArcade()`).
- Selection is bound to `?view=total|il|mario|crokinole` via `useViewCategory`.
- `App.tsx` runs `rankByCategory(data.teams, category)` before passing to `Podium` and `Leaderboard`. Outside Total, the list collapses to rank / avatar / name / active-category points / last activity.
- Row-flash animation is suppressed for the single render after a tab change (`useFlashedTeams`).

### Theme (hamburger menu)
- `HamburgerMenu.tsx` exposes three themes: **light**, **dark**, **Mario arcade**.
- Mario mode swaps in pixel-art row/podium/tab variants, enables sound effects (toggleable from the same menu), and flips `UpdatedPill` into `LIVE` mode. Footer stays visible in every theme.
- The menu also surfaces a cross-link between leaderboard (`/`) and admin (`/admin`).

### Announcement banner
- `AnnouncementBanner.tsx` (in `components/leaderboard/`) renders a single dismissible banner above the podium when an admin announcement is active.
- Driven by `useAnnouncement()`: fetches `GET /api/announcement`, refreshes on the same SSE `leaderboard-updated` event used for standings.
- Dismissal is client-local, keyed by `messageId` in `localStorage` — publishing a new message (new id) re-shows the banner.
- Authoring lives in `pages/admin/AnnouncementPanel.tsx` (publish / clear / preview), backed by `PUT|DELETE /api/admin/announcement`.

### Mock data for mockup phase
- `src/mocks/leaderboard.live.json` — 30 teams, varied points, realistic `lastActivityAt` spread.
- `src/mocks/leaderboard.pre.json` — `phase: "pre"`, `teams: []`.
- `src/mocks/leaderboard.ended.json` — `phase: "ended"`, frozen standings.
- `client.ts` reads `import.meta.env.VITE_USE_MOCKS` → returns fixture on `true`. No server required for mockup work.

## Steps
1. Scaffold Vite app + TS config.
2. Implement `client.ts` with typed response.
3. Implement hook with polling + visibility + backoff.
4. Build `Leaderboard` composed of `TeamRow`.
5. Compose in `App.tsx` with header + footer.
6. Add dev proxy rule `/api → localhost:3000` in `vite.config.ts`.

## Verification
- Incognito load → leaderboard renders within first fetch.
- DevTools network: only same-origin `/api/*`. No ImmersiveLab domain. No secrets in JS bundle.
- Tab hidden 2 min → no polling. On focus → immediate fetch.
- Server down → backoff, error banner; recovers on return.
- Set `EVENT_START_AT` to future → UI shows "pre" state.
- Set `EVENT_END_AT` to past → UI shows "ended" banner, standings frozen.
