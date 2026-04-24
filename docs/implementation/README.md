# Implementation Plans

Per-part build plans derived from [../dashboard-plan.md](../dashboard-plan.md) and [../data-flow.md](../data-flow.md).

**Status legend:** ✅ shipped · 🟡 partial · ⏳ planned. All parts below are **✅ shipped in v1** on `develop` at time of writing.

## Parts
0. ✅ [dashboard-storage-plan.md](dashboard-storage-plan.md) — **read first.** Scope decisions for the 30-team / 8-hour event: fresh accounts, `Account.points` scoring, `snapshot.json` + `token.json` on named volume, reduced role of `EVENT_START_AT` / `EVENT_END_AT`.
1. ✅ [server-proxy.md](server-proxy.md) — Fastify HTTP server, routing, static + `/api/*`, SSE.
2. ✅ [immersiveLab-client.md](immersiveLab-client.md) — ImmersiveLab token cache + `/v2/accounts` walker (list + detail, concurrency 8) + `@immersivelabs.pro` filter.
3. ✅ [aggregation.md](aggregation.md) — per-team points aggregation + snapshot cache + phase/freeze + three-category bonus merge.
4. ✅ [frontend.md](frontend.md) — React app, polling + SSE hook, components, category tabs, arcade theme.
5. ✅ [deployment.md](deployment.md) — Multi-stage Docker build, named volume `greengauntlet-data`, dev workflow.
6. ✅ [env-config.md](env-config.md) — env vars, `.env.example`.
7. ✅ [admin-bonus-plan.md](admin-bonus-plan.md) — Admin page + three-category bonus points in `bonus.sqlite`; batch-commit, SSE push, per-team active toggle, CSV export.
8. ✅ [category-tabs-plan.md](category-tabs-plan.md) — public dashboard `Total` / `Immersive Lab` / `Mario` / `Crokinole` tabs with shared podium + list.

Historical build order: 0 → 1 → 2 → 3 → 4 → 6 → 5 → 7 → 8.
