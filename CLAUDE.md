# TheGreenGauntlet

## Project Context
See [docs/project.md](docs/project.md) for goals, API details, and decisions.

## docs/
- `project.md` — overview, API base URL, goals
- `immersivelab-api.json` — full OpenAPI 3.1 spec for the Immersive Labs API
- `dashboard-plan.md` — leaderboard dashboard architecture, API usage, verification steps
- `data-flow.md` — sequence + aggregation rules + security invariants
- `V1V2Scope.md` — scope split vs `devops-day-leaderboard`
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
