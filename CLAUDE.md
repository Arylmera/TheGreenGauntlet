# TheGreenGauntlet

## Project Context
See [docs/project.md](docs/project.md) for goals, API details, and decisions.

## docs/
- `project.md` — overview, API base URL, goals
- `immersivelab-api.json` — full OpenAPI 3.1 spec for the Immersive Labs API
- `dashboard-plan.md` — leaderboard dashboard architecture, API usage, verification steps
- `data-flow.md` — sequence + aggregation rules + security invariants
- `V1V2Scope.md` — scope split vs `devops-day-leaderboard`
- `perf.md` — performance test plan (k6 scenarios, IL mock, pass/fail criteria for the 8h event)
- `implementation/` — per-module build plans. **Start with `dashboard-storage-plan.md`** (scope decisions for 30-team / 8-hour event: fresh accounts, `Account.points` scoring, named-volume persistence, reduced role of `EVENT_START_AT` / `EVENT_END_AT`).
- `implementation/admin-bonus-plan.md` — **v1 shipped; v1.1 redesign planned.** Admin page + per-team bonus points in a separate SQLite file. v1.1 splits bonuses into **three fixed categories**: `mario_points` and `crokinole_points` (shown as own columns on public leaderboard) and `helping_points` (merged into the IL column). Batch-commit flow, SSE push to public dashboard, per-team active toggle for DQ/hide.
- `guidelines/` — stack conventions (React, TS, Node proxy, styling, testing, security, git).

## Guidelines policy (mandatory)
Before writing or modifying code, **read the relevant file(s) in `docs/guidelines/`** and follow them:
- React/JSX/hooks → [docs/guidelines/REACT.md](docs/guidelines/REACT.md)
- `.ts`/`.tsx` anywhere → [docs/guidelines/TYPESCRIPT.md](docs/guidelines/TYPESCRIPT.md)
- `server/**`, proxy, ImmersiveLab client → [docs/guidelines/NODE-API.md](docs/guidelines/NODE-API.md)
- CSS, Tailwind, layout, responsive → [docs/guidelines/STYLING.md](docs/guidelines/STYLING.md)
- `*.test.*`, `*.spec.*`, vitest, supertest → [docs/guidelines/TESTING.md](docs/guidelines/TESTING.md)
- auth, secrets, env, PII, CORS, rate-limit → [docs/guidelines/SECURITY.md](docs/guidelines/SECURITY.md)
- branches, commits, PRs → [docs/guidelines/GIT.md](docs/guidelines/GIT.md)

Rules:
1. If a guideline conflicts with a user request, surface the conflict before acting — don't silently violate.
2. If a guideline is wrong or outdated, propose an edit to the guideline in the same change. Don't work around it.
3. When adding a new convention the user confirms, append it to the relevant guideline file so it persists.

## Hot files (orientation map)
**If a summary covers your need, do not Read the file.** Read only before Edit, or when the summary is insufficient. Verify paths with `Glob` if a summary feels stale.

### `src/App.tsx`
9-line router. `window.location.pathname.startsWith('/admin')` → `<AdminPage />`, else `<PublicDashboard />`. No state, no hooks. **Skip the Read** unless changing the routing rule itself.

### `src/pages/Admin.tsx`
Root admin page. State machine: `authed === null` (loading) → `!authed` (login) → authed (teams table), gated by `useAdminAuth`.
- Loading branch renders own `<HamburgerMenu>` + optional `<SkyStage>` (mario). Login/authed branches delegate chrome to `AdminLoginForm` / `AdminTeamsTable` and pass `theme` + `onSetTheme` down.
- Theme from `useTheme`. No business logic — pure shell.

### `src/components/podium/Podium.tsx`
Top-3 medal podium. Visual order `PODIUM_ORDER = [2, 1, 3]` (silver–gold–bronze).
- Props: `top: Team[]`, optional `category?: Category` (selects score field via `CATEGORY_SCORE_FIELD` from `../../types`).
- Mario theme renders `<PipeStep>` per rank with `pipeRatios()` (pts2/pts1 clamped 0.85–0.94, pts3 clamped 0.78–(ratio2−0.05)).
- Default theme renders `<PanelStep>` per rank with `computeScale()` (rank 1 = 1.0; ranks 2/3 = `points/topPoints` clamped to `MIN_SCALE = 0.6`).
- Sibling files in same dir: `PipeStep.tsx`, `PanelStep.tsx`, `podium.constants.ts` (`Rank` type lives there). Responsive widths and styling live in those step components, not in `Podium.tsx`.
- Theme via `useArcade()`.

### `src/components/leaderboard/Leaderboard.tsx`
Main leaderboard panel. Composes `<LeaderboardToolbar>` + `<table>` (`<LeaderboardTableHead>` + `<TeamRow>` rows).
- Props: `teams: Team[]`, `category?: Category` (default `'total'`), optional `onCategoryChange`.
- Local state: `query` (search filter on `displayName`), `showTopThree` (default `false` — top 3 hidden, toolbar toggle reveals them; podium covers them visually).
- `displayedTeams = showTopThree ? teams : teams.slice(3)`; then case-insensitive substring filter by `query` → `visibleTeams`.
- Hooks: `useArcade` (mario theme branch picks `scroll-panel` class), `useRowAnimations(tbodyRef, teams)` for rank-change pulses, `useFlashedTeams(teams, category)` for delta highlight.
- Empty-state colspan: `category === 'total' ? 8 : 5`. ARIA: section is a `tabpanel` with `id="gg-leaderboard-panel"`, labelled by `gg-tab-${category}` when tabs exist.
- Sibling files in same dir: `LeaderboardTabs.tsx`, `LeaderboardTableHead.tsx`, `LeaderboardToolbar.tsx`, `TeamRow.tsx` (+ `.mario` variant), `TeamAvatar.tsx`, `SkeletonBoard.tsx`, `AnnouncementBanner.tsx`.

### `src/styles.css` (section map, ~760 lines)
Mario is primary theme; light/dark via `.dark` class + CSS vars. **All mario-specific rules are scoped to `:root[data-theme='mario']`.**
- L1–4: Tailwind directives.
- L5–71: `@layer base` (resets, body fonts, focus styles).
- L72–116: `@layer utilities`.
- L117–152: themed-scroll (mario-skinned scrollbars).
- L154–208: mario root vars (`--mario-*` palette) + body/surface overrides.
- L209–301: sky stage, cloud lanes (`drift-clouds` keyframes L229), hill band, brick ground.
- L276–351: mario footer, pixel borders, title chunk, Q-block.
- L352–460: pipe styling (used by `PipeStep`), plaque + tape (used by `PanelStep`).
- L461–518: keyframes (`coin-spin` L461) + sparkle.
- L519–571: `prefers-reduced-motion: no-preference` block, scroll-panel/header/row, rank-badge.
- L572–660: pixel inputs (`.pixel-input`, `.pixel-coin-input`), pixel buttons (`.pixel-btn` L632).
- L662–697: pill-arcade (`.pill-arcade`), `pulse-live` keyframes (L685), `.mario-bounce` (L693).
- L698–754: mushroom toggle (`.mushroom-toggle`), `.delta` accent.
- L755–end: `@media (prefers-reduced-motion: reduce)` + light/dark overrides.

### `docs/dashboard-plan.md` (~198 lines)
Master plan for the public leaderboard. Read only if implementing a new endpoint or changing the architecture; otherwise this map is enough.
- L3–8: Context (8h event, 30 teams, fresh IL accounts, single Node service).
- L10–19: Auth model (proxy mandatory; secrets server-side only; ~10s aggregated cache).
- L21–28: ImmersiveLab API facts (base URL, `POST /v1/public/tokens`, `/v2/accounts`, no leaderboard endpoint, no Event entity).
- L30–57: Architecture + proxy endpoints. **Wire shape** of `GET /api/leaderboard` is here (L39): `{ uuid, displayName, immersivelab_points, il_points, mario_points, crokinole_points, total, lastActivityAt, rank }`. SSE stream + admin endpoints listed here too.
- L45–57: Proxy internals (Fastify, snapshot cache, single-flight, freeze on `phase === 'ended'`, sort + tie-break).
- L58–99: Frontend layout (`src/api`, `src/hooks`, `src/components/{leaderboard,podium,menu,layout,mario}`, `src/pages`).
- L101–126: Responsive UX rules + breakpoints (`sm/md/lg/xl/2xl`) + TV mode (`?tv=1`).
- L131–141: Env vars (`IMMERSIVELAB_*`, `EVENT_*`, `SNAPSHOT_TTL_MS`, `DATA_DIR`, `ADMIN_*`).
- L142–164: Files-as-shipped manifest (server/* and src/* tree).
- L166–193: Verification (curl checks, runtime layout, Docker volume).

### `docs/data-flow.md` (~150 lines)
Sequence + aggregation rules + security invariants. Read for refresher when touching the aggregator or admin write path.
- L9–63: Mermaid sequence (public viewer SSE + 30s poll; admin POST → DB → invalidate cache → SSE → refetch ~100 ms).
- L65–100: Mermaid data-shape diagram (proxy caches, bonus.sqlite, scrub PII before response).
- L102–116: Auth bootstrap (token cache + token.json on volume + 401 retry).
- L118–131: **Aggregation rules.** `Account.points: null → 0`. `il_points = Account.points + helping_points`. `total = il_points + mario_points + crokinole_points`. `active = 0` rows excluded entirely. Phase: `pre` returns `teams: []`; `ended` freezes snapshot.
- L133–145: Endpoint inventory. Confirms unused IL endpoints (`/v2/activities`, `/v2/attempts`, `/v2/teams`, `/v2/teams/{id}/memberships`, deprecated `Account.teams`).
- L147–151: Security invariants (no creds in browser bundle, no passthrough, scrub email).

### `docs/implementation/admin-bonus-plan.md` (~330 lines)
**v1.1 shipped on `develop`** (file's own first line). Three categories: `mario_points`, `crokinole_points`, `helping_points`. SQLite `team_bonus` store (`data/bonus.sqlite`, WAL).
- Public wire: `mario_points` and `crokinole_points` are own columns; `helping_points` merges into public `il_points` and is hidden from spectators.
- Aggregator merge: `il_out = il_raw + helping_points`; `total = il_out + mario_points + crokinole_points`. Inactive teams (`active = 0`) excluded entirely.
- Admin UI: per-team batch deltas (Mario → Crokinole → Helping order). Batch rejects if any category would go negative; duplicate `{teamId, category}` rows summed.
- Undo = re-enter negative delta; last-write-wins; per-category clamp ≥ 0; auth-gated CSV export.
- SSE event `leaderboard-updated` on bonus write or active toggle. Single banner, dismissed client-side by `messageId`.
- Files actually shipped: `server/bonusDb.ts`, `server/routes/admin/bonus.ts`, `server/aggregate.ts`, `src/admin/`. (Note: doc body still references old paths in places — trust the codebase if it diverges.)
