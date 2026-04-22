# Implementation Plans

Per-part build plans derived from [../dashboard-plan.md](../dashboard-plan.md) and [../data-flow.md](../data-flow.md).

## Parts
1. [server-proxy.md](server-proxy.md) — Node HTTP server, routing, static + `/api/*`.
2. [il-client.md](il-client.md) — IL token cache + paginated walkers.
3. [aggregation.md](aggregation.md) — per-account points aggregation + snapshot cache.
4. [frontend.md](frontend.md) — React app, hook, components.
5. [deployment.md](deployment.md) — Docker build, dev workflow.
6. [env-config.md](env-config.md) — env vars, `.env.example`.

Build order: 1 → 2 → 3 → 4 → 6 → 5.
