# Testing

- Test behavior at boundaries: proxy route handlers, aggregation logic, Zod schemas.
- Do not mock ImmersiveLab HTTP in aggregation tests — fixture the JSON responses instead (real shape, no network).
- Skip tests for trivial render; cover: sort order, tie-break, event-window filtering, best-attempt selection, token refresh on 401.
- One bug → one regression test before the fix.
- `vitest` for unit tests; hit the Fastify surface via `app.inject(...)` (see `server/__tests__/routes.test.ts`, `admin.test.ts`) — no `supertest`, no real HTTP listener in tests.
- No snapshot tests on leaderboard markup — churn cost > value.
