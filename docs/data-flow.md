# Data Flow: Account Points → Public Dashboard

Site is public. Browser never sees an ImmersiveLab token. A backend proxy holds the secret, exchanges for an access token, walks `/v2/accounts`, aggregates a per-team leaderboard (1 Immersive Labs account per team), and returns a scrubbed snapshot.

> **Note:** teams receive fresh Immersive Labs accounts at `EVENT_START_AT`, so `Account.points` is event-scoped by construction. No `/v2/attempts` walk, no `completedAt` filtering. See [implementation/aggregation.md](implementation/aggregation.md) and [implementation/dashboard-storage-plan.md](implementation/dashboard-storage-plan.md).
>
> **Admin bonus layer:** on top of `Account.points`, an authenticated admin page awards per-team bonus points for on-site challenges. Bonuses live in a separate SQLite file (`bonus.sqlite`) and merge into the leaderboard total (`total = il_points + bonus_points`). Admin writes push via SSE so the public dashboard updates within ~100 ms. See [implementation/admin-bonus-plan.md](implementation/admin-bonus-plan.md).

## Sequence

```mermaid
sequenceDiagram
    participant U as Public viewer
    participant FE as React app
    participant PX as Proxy (/api)
    participant ImmersiveLab as api.immersivelabs.online

    U->>FE: open site (no login)
    loop every 30s (pauses if document.hidden)
        FE->>PX: GET /api/leaderboard
        alt phase == ended
            PX-->>FE: frozen last snapshot (no upstream call)
        else cached <10s
            PX-->>FE: cached snapshot
        else stale
            PX->>PX: ensure access token (refresh if expired)
            alt token missing or expired
                PX->>ImmersiveLab: POST /v1/public/tokens (access_key + secret)
                ImmersiveLab-->>PX: accessToken ~30 min
            end
            PX->>ImmersiveLab: GET /v2/accounts?page_token=...
            ImmersiveLab-->>PX: page + nextPageToken
            Note over PX,ImmersiveLab: repeat until null
            PX->>PX: sort teams desc by points, tie-break by lastActivityAt, then name
            PX->>PX: scrub PII (drop email)
            PX->>PX: cache snapshot (memory + /app/data/snapshot.json)
            PX-->>FE: { teams[], phase, eventWindow, updatedAt }
        end
        FE->>U: render Leaderboard
        alt ImmersiveLab returns 401
            PX->>ImmersiveLab: POST /v1/public/tokens (refresh)
            PX->>ImmersiveLab: retry request
        end
    end
```

## Data shape

```mermaid
flowchart LR
    subgraph Browser
      UI[Leaderboard]
    end
    subgraph Proxy
      CACHE[("10s snapshot cache")]
      DISK[("/app/data/snapshot.json")]
      TOK[("access token cache + token.json")]
      AGG[Aggregate + sort]
    end
    subgraph ImmersiveLab_API
      A["GET /v2/accounts (paginated)"]
    end

    UI -->|"GET /api/leaderboard"| CACHE
    CACHE -.miss.-> AGG
    AGG --> A
    TOK -.->|"Bearer"| A
    AGG -->|"ranked teams"| CACHE
    CACHE <--> DISK
    TOK <--> DISK
    CACHE -->|"scrubbed JSON"| UI
```

## Auth bootstrap (server-side only)

```mermaid
flowchart TD
    ENV["env IMMERSIVELAB_ACCESS_KEY + IMMERSIVELAB_SECRET_TOKEN"] --> PX[Proxy startup]
    PX --> LOAD["load token.json from /app/data (if present)"]
    LOAD --> CHK{token cached and fresh}
    CHK -->|yes| USE["use cached accessToken"]
    CHK -->|no| EX["POST /v1/public/tokens"]
    EX --> TK["accessToken ~30 min in memory + token.json"]
    TK --> USE
    USE --> CALL["GET /v2/accounts with Authorization Bearer"]
    CALL -->|"401"| EX
    CALL -->|"2xx"| OUT["return to aggregator"]
```

## Aggregation rules
- `Account.points: null` → treat as `0`.
- Leaderboard `total = il_points + bonus_points`, where `il_points = Account.points` and `bonus_points` comes from `team_bonus.points` in `bonus.sqlite` (0 if the row is missing). Fresh accounts = event-scoped by construction; no `completedAt` filtering needed.
- Teams with `team_bonus.active = 0` are excluded from the payload (hidden / DQ).
- **Event window** (`EVENT_START_AT` / `EVENT_END_AT`) drives **phase + freeze**, not scoring:
  - `now < EVENT_START_AT` → `phase = "pre"`, `teams: []` (protects against cred leaks before start).
  - `in-window` → `phase = "live"`, normal aggregation.
  - `now > EVENT_END_AT` → `phase = "ended"`, freeze: stop rebuilds, keep serving last pre-end snapshot.
- Sort teams desc by `total`. Tie-break: `lastActivityAt` asc (earlier finisher wins), then `displayName` asc.
- Snapshot cached for ~10 s (`SNAPSHOT_TTL_MS`) in memory, persisted to `/app/data/snapshot.json` on every successful rebuild (atomic tmp + rename). Loaded on boot so restart serves stale instantly.
- Admin bonus writes invalidate the snapshot cache and emit a `leaderboard-updated` SSE event; public clients refetch within ~100 ms instead of waiting for the 30 s poll.

## Endpoints
**Proxy → browser (public, read-only)**
- `GET /api/leaderboard` — ranked team snapshot `{ teams: [{ il_points, bonus_points, total, ... }], phase, eventWindow, updatedAt }`.
- `GET /api/leaderboard/stream` — SSE, emits `leaderboard-updated` on cache invalidation.
- `GET /api/health` — proxy + token status + `eventWindow`.

**Proxy → browser (admin, cookie-auth)**
- `POST /api/admin/login` / `/logout`; `GET /api/admin/bonus`; `POST /api/admin/bonus/batch`; `PATCH /api/admin/bonus/:teamId/active`; `GET /api/admin/export.csv`. See [implementation/admin-bonus-plan.md](implementation/admin-bonus-plan.md).

**Proxy → ImmersiveLab (server-side, authenticated)**
- `POST /v1/public/tokens` — token exchange.
- `GET /v2/accounts` — paginated.
- Not used: `/v2/activities`, `/v2/attempts`, `/v2/teams`, `/v2/teams/{id}/memberships`, deprecated `Account.teams`.

## Security invariants
- No ImmersiveLab credentials or tokens in the JS bundle, HTML, or any response the browser receives.
- No passthrough endpoint that forwards arbitrary ImmersiveLab paths.
- Responses scrubbed: drop PII fields not needed by the UI (keep `displayName`; drop `email`).
