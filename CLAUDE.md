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
- React/JSX/hooks → [docs/guidelines/react.md](docs/guidelines/react.md)
- `.ts`/`.tsx` anywhere → [docs/guidelines/typescript.md](docs/guidelines/typescript.md)
- `server/**`, proxy, ImmersiveLab client → [docs/guidelines/node-api.md](docs/guidelines/node-api.md)
- CSS, Tailwind, layout, responsive → [docs/guidelines/styling.md](docs/guidelines/styling.md)
- `*.test.*`, `*.spec.*`, vitest, supertest → [docs/guidelines/testing.md](docs/guidelines/testing.md)
- auth, secrets, env, PII, CORS, rate-limit → [docs/guidelines/security.md](docs/guidelines/security.md)
- branches, commits, PRs → [docs/guidelines/git.md](docs/guidelines/git.md)

Rules:
1. If a guideline conflicts with a user request, surface the conflict before acting — don't silently violate.
2. If a guideline is wrong or outdated, propose an edit to the guideline in the same change. Don't work around it.
3. When adding a new convention the user confirms, append it to the relevant guideline file so it persists.
