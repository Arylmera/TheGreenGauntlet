# Implementation Plans

Per-part build plans derived from [../dashboard-plan.md](../dashboard-plan.md) and [../data-flow.md](../data-flow.md).

## Parts
0. [dashboard-storage-plan.md](dashboard-storage-plan.md) — **read first.** Scope decisions for the 30-team / 8-hour event: fresh accounts, `Account.points` scoring, `snapshot.json` + `token.json` on named volume, reduced role of `EVENT_START_AT` / `EVENT_END_AT`.
1. [server-proxy.md](server-proxy.md) — Node HTTP server, routing, static + `/api/*`.
2. [immersiveLab-client.md](immersiveLab-client.md) — ImmersiveLab token cache + `/v2/accounts` walker.
3. [aggregation.md](aggregation.md) — per-team points aggregation + snapshot cache + phase/freeze.
4. [frontend.md](frontend.md) — React app, hook, components.
5. [deployment.md](deployment.md) — Docker build, named volume, dev workflow.
6. [env-config.md](env-config.md) — env vars, `.env.example`.
7. [admin-bonus-plan.md](admin-bonus-plan.md) — Admin page + per-team bonus points (on-site challenges) persisted in a separate SQLite file; merged into leaderboard total. Includes batch-commit flow, SSE push to public dashboard, and per-team active toggle for DQ/hide.

Build order: 0 → 1 → 2 → 3 → 4 → 6 → 5. Part 7 (admin bonus) slots in after 3 (aggregation) once approved — see its own build order.
