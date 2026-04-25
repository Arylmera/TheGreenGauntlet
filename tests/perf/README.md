# Performance Tests

See [docs/perf.md](../../docs/perf.md) for the full plan, scenarios, and pass/fail criteria.

## Quick start

```bash
# 1. Start the app with the built-in stub upstream (one terminal)
USE_STUB_UPSTREAM=true \
ADMIN_PASSWORD=perftest \
ADMIN_SESSION_SECRET=perftest-secret-must-be-32-chars-long \
COOKIE_SECURE=false \
NODE_ENV=development \
EVENT_START_AT=2026-01-01T00:00:00Z \
EVENT_END_AT=2027-01-01T00:00:00Z \
DATA_DIR=./.perf-data \
npm run dev:server

# 2. Run a scenario (other terminal)
npm run perf:steady
```

For scenario 5 (degraded upstream), run the mock IL server first:

```bash
MOCK_IL_LATENCY_MS=5000 MOCK_IL_ERROR_RATE=0.2 npm run perf:mock-il
```

then start the app pointing at it (see [docs/perf.md](../../docs/perf.md) §Mock IL Option B).

## Layout

- `mock-il/` — Fastify mock of the Immersive Labs API for fault-injection scenarios.
- `lib/` — shared helpers for k6 scripts.
- `scenarios/` — one k6 script per scenario.
- `results/` — gitignored output (JSON + HTML).
