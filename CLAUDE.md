# TheGreenGauntlet

## Project Context
See [docs/project.md](docs/project.md) for goals, API details, and decisions.

## docs/
- `project.md` — overview, API base URL, goals
- `immersivelab-api.json` — full OpenAPI 3.1 spec for the Immersive Labs API
- `dashboard-plan.md` — leaderboard dashboard architecture, API usage, verification steps
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
