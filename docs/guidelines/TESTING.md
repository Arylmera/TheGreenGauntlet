# Testing

- Test behavior at boundaries: proxy route handlers, aggregation logic, Zod schemas.
- Do not mock ImmersiveLab HTTP in aggregation tests — fixture the JSON responses instead (real shape, no network).
- Skip tests for trivial render; cover: sort order, tie-break, event-window filtering, best-attempt selection, token refresh on 401.
- One bug → one regression test before the fix.
- `vitest` for unit, `supertest` for the Express surface.
- No snapshot tests on leaderboard markup — churn cost > value.
