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
Skim these summaries instead of re-reading the files just to orient. Still Read before Editing.

### `src/pages/Admin.tsx`
Root admin page. State machine: loading → login → teams table, gated by `useAdminAuth`.
- Renders `AdminLoginForm` (unauthed) or `AdminTeamsTable` (authed); `HamburgerMenu` always.
- Theme via `useTheme`; mario theme adds `<SkyStage>` background.
- No business logic here — delegates to hooks/children.

### `src/components/Podium.tsx`
Top-3 medal podium. Visual order `[2,1,3]` (silver–gold–bronze).
- Props: `top: Team[]`, optional `category?: Category` (selects score field via `CATEGORY_SCORE_FIELD`).
- Heights: rank 1 = 100%; ranks 2/3 scaled by point ratio, clamped 60–94%.
- Responsive widths: `w-28 sm:w-40 lg:w-56 2xl:w-80`. Uses `useArcade` for theme.

### `src/styles.css` (section map)
Mario is primary theme; light/dark via `.dark` class + CSS vars.
- L1–150: `:root` CSS vars (`--mario-*` palette).
- L151–400: pixel buttons (`.pixel-btn`), arcade pills (`.pill-arcade`), live-dot pulse.
- L401–700: mushroom toggle (`.mushroom-toggle`), themed checkbox.
- L701–900: animations (`.mario-bounce`, cloud lanes, coin spin).
- L901–end: `prefers-reduced-motion`, delta accent colors, light/dark overrides.
- All mario rules scoped to `:root[data-theme='mario']`.

### `docs/implementation/admin-bonus-plan.md`
- v1: shipped on develop. Undo = re-enter negative; last-write-wins; per-category clamp ≥ 0; auth-gated CSV export.
- v1.1: three hardcoded categories — `mario`, `crokinole`, `helping`.
  - Public leaderboard: `mario_points` and `crokinole_points` as own columns; `helping` merges into public `il_points`.
  - Admin field name on bonus row: `immersivelab_points` (distinct from public `il_points`).
  - Admin UI: one delta input per category, order Mario → Crokinole → Helping.
  - Batch rejects if any category would go negative; duplicate `{teamId, category}` rows summed.
  - SSE event: `leaderboard-updated`. Single banner, dismissed client-side by `messageId`.
