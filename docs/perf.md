# Performance Test Plan

Canonical reference for load-testing TheGreenGauntlet ahead of the live event. Source-of-truth for what we test, why, how to run it, and how to interpret results.

## Context

8-hour live event, ~30 teams. The stack is a single Node (Fastify) process serving the React bundle and an `/api` proxy to the Immersive Labs API, with SQLite for bonus state and SSE push for real-time updates. No perf testing has been done before; no load tooling was in the repo.

Goals:

- Validate the system under realistic event load before the event.
- Surface bottlenecks (IL upstream rate limits, SSE fan-out, SQLite write contention, snapshot rebuild storms).
- Produce a go/no-go signal with concrete numbers.

Design invariant to verify (`docs/implementation/dashboard-storage-plan.md:99`): "30 simultaneous `/api/leaderboard` hits trigger exactly one upstream rebuild." Tests must hold this under worse-than-expected load.

## Load Model

| Class | SSE viewers | Admin activity | Notes |
|---|---|---|---|
| Realistic | ~90 (30 teams × 3) | bonus batch every 10–30 min | Baseline event load |
| Stress (3×) | 300 | bonus batch every 60s | Primary test target |
| Burst | 300 within 5s | — | Kickoff scenario |
| Soak | 100 for 8h | — | Memory/leak check |

## Scenarios

1. **Steady-state SSE fan-out** — ramp 100 → 300 `EventSource('/api/leaderboard/stream')` clients, hold 15 min. Measure: connect success rate, time-to-first-event, IL call count (must stay near `1 / SNAPSHOT_TTL_MS`), memory.
2. **Thundering herd** — 300 clients connect within 5s. Measure: rebuild dedup (single IL fetch), p95 first-payload latency.
3. **Polling fallback** — 300 clients polling `/api/leaderboard` every 30s. Verify snapshot cache absorbs hits without extra IL calls.
4. **Admin batch under viewer load** — 100 SSE clients connected, admin pushes `POST /api/admin/bonus/batch` every 30s for 10 min. Measure: SQLite write latency, SSE propagation latency, no failed transactions.
5. **Degraded upstream** — IL mock returns 5s latency / intermittent 503s. Verify `rebuildWithFallback` serves stale snapshot, client backoff (`MAX_BACKOFF_MS=120_000`) honored, no tight retry loops.
6. **Admin login brute-force** — 100 req/min from same IP. Verify rate limiter (20/5min) blocks without affecting public endpoints.
7. **Soak** — scenario 1 at 100 clients for 8 hours. Memory leak, file descriptor count, SQLite file growth, token refresh cycles.

## Pass/Fail Criteria

| Metric | Target |
|---|---|
| `/api/leaderboard` p95 latency (cached hit) | < 100 ms |
| SSE first-event latency at connect | < 500 ms |
| IL API call rate at 300 concurrent clients | ≤ 6/min (1 per `SNAPSHOT_TTL_MS=10s`) |
| Admin bonus batch round-trip + SSE propagation | < 1 s |
| Memory growth over 8h soak | < 20 % |
| Event loop lag p99 | < 100 ms |
| Failed SSE connects under 300-client burst | 0 |
| Lighthouse Performance (mobile) | ≥ 90 (existing project NFR) |

## Tooling

**k6** for all load scenarios. Native HTTP; SSE handled via long-held HTTP requests in k6 (full event-level SSE metrics need [`xk6-sse`](https://github.com/phymbert/xk6-sse) — see *Optional: xk6-sse* below).

Scripts live under `tests/perf/scenarios/`. Results go to `tests/perf/results/` (gitignored).

### Install

```bash
# macOS
brew install k6

# Windows (winget)
winget install GrafanaLabs.k6
# alternatives: choco install k6  |  scoop install k6
# or download from https://github.com/grafana/k6/releases

# Linux (Debian/Ubuntu)
sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update && sudo apt install k6
```

### Optional: xk6-sse

For per-event SSE latency metrics (rather than just connection-level metrics), build a custom k6 binary:

```bash
go install go.k6.io/xk6/cmd/xk6@latest
xk6 build --with github.com/phymbert/xk6-sse@latest
# produces ./k6 — use that instead of system k6
```

The default scripts work without xk6-sse; they just won't break out per-event delivery latency.

## Mock Immersive Labs API

Two options. Pick based on what the scenario needs.

### Option A — built-in stub (fast, no extra process)

The server already supports `USE_STUB_UPSTREAM=true` (`server/immersivelab/stubClient.ts`). Use it for scenarios 1–4, 6, 7. Set in your perf-run env:

```bash
USE_STUB_UPSTREAM=true
ADMIN_PASSWORD=perftest
ADMIN_SESSION_SECRET=perftest-secret-must-be-32-chars-long
COOKIE_SECURE=false
NODE_ENV=development
EVENT_START_AT=2026-01-01T00:00:00Z
EVENT_END_AT=2027-01-01T00:00:00Z
PORT=3000
DATA_DIR=./.perf-data
```

### Option B — Fastify IL mock with latency/error injection (scenario 5 only)

`tests/perf/mock-il/server.mjs` — minimal Fastify server that serves `/oauth/token`, `/v2/accounts`, `/v2/accounts/:uuid` with configurable latency and error rate via env. Run alongside the app:

```bash
# terminal 1
MOCK_IL_PORT=4100 MOCK_IL_LATENCY_MS=5000 MOCK_IL_ERROR_RATE=0.2 node tests/perf/mock-il/server.mjs

# terminal 2 (point app at the mock)
USE_STUB_UPSTREAM=false \
IMMERSIVELAB_ACCESS_KEY=fake \
IMMERSIVELAB_SECRET_TOKEN=fake \
IMMERSIVELAB_BASE_URL=http://localhost:4100 \
ADMIN_PASSWORD=perftest \
ADMIN_SESSION_SECRET=perftest-secret-must-be-32-chars-long \
COOKIE_SECURE=false \
NODE_ENV=development \
EVENT_START_AT=2026-01-01T00:00:00Z \
EVENT_END_AT=2027-01-01T00:00:00Z \
DATA_DIR=./.perf-data \
npm run dev:server
```

## Running

Each scenario is a `npm run perf:<name>` script. Examples:

```bash
npm run perf:steady           # scenario 1
npm run perf:thundering-herd  # scenario 2
npm run perf:polling          # scenario 3
npm run perf:admin-batch      # scenario 4
npm run perf:degraded         # scenario 5 (needs mock IL running)
npm run perf:bruteforce       # scenario 6
npm run perf:soak             # scenario 7 (8h)
```

Override target host with `BASE_URL=http://localhost:3000` (default). Override admin password with `ADMIN_PASSWORD=...`.

Each run produces three files in `tests/perf/results/`:

- `<scenario>.html` — k6 web-dashboard HTML report (open in a browser; this is the human-readable one)
- `<scenario>-summary.json` — end-of-test summary (thresholds, per-metric stats) — small, easy to diff
- `<scenario>.json` — raw per-sample output — large, for post-processing only

The end-of-test summary is also printed to your terminal.

### Pre-event smoke against real IL

Before the event, run a one-off smoke at low concurrency (10 clients, 5 min) against real IL credentials to exercise the real token refresh path. Not part of the k6 suite (cost / rate-limit risk):

```bash
BASE_URL=https://staging.example.com k6 run --vus 10 --duration 5m tests/perf/scenarios/scenario-1-steady.js
```

## Interpreting Results

For each run, check (in this order):

1. **Did the load actually arrive?** k6 summary's `http_reqs` and `vus_max` match the scenario's intent.
2. **Were responses successful?** `http_req_failed` rate ~0; no 5xx in server logs.
3. **Latency targets hit?** Compare `http_req_duration` p95 against the table above.
4. **Did dedup hold?** Server log `aggregator.rebuild` count over the run window. For 15 min at `SNAPSHOT_TTL_MS=10s`, expect ~90 rebuilds regardless of viewer count. Anything proportional to VU count is a regression.
5. **Memory/event loop?** `process.memoryUsage().rss` should be flat after warmup; event loop lag p99 < 100 ms.
6. **SSE specifically:** with xk6-sse, `sse_event_received` count should grow ~once per `SNAPSHOT_TTL_MS` per VU. Without it, infer from kept-open HTTP request count.

## Findings & Tuning

After the first round, write conclusions to `docs/perf-findings.md` with:

- Numbers per scenario vs target table.
- Bottlenecks identified.
- Recommended config changes (likely candidates: bump `SNAPSHOT_TTL_MS`, raise SSE listener cap, enable SQLite WAL mode if not already on, tune Fastify `keepAliveTimeout`).
- Re-run plan to verify fixes.

## Critical files (reference)

- `server/leaderboard/aggregator.ts` — snapshot TTL, rebuild dedup, fallback path
- `server/routes/leaderboard.ts` — SSE keepalive (25 s), event name `leaderboard-updated`
- `server/immersivelab/client.ts` — pagination + token retry
- `server/immersivelab/stubClient.ts` — stub used by `USE_STUB_UPSTREAM=true`
- `server/bonus/db.ts` — `applyBatchDeltas` transaction (write hotspot)
- `server/env.ts` — `SNAPSHOT_TTL_MS=10000`, `TOKEN_REFRESH_MARGIN_S=60`, `ADMIN_SESSION_TTL_MS=172800000`
- `src/hooks/useLeaderboard.ts:7` — client `POLL_MS=30000`, `MAX_BACKOFF_MS=120000`
