# Data Flow: Account Points → Public Dashboard

Site is public. Browser never sees an IL token. A backend proxy holds the secret, exchanges for an access token, walks the IL API, aggregates a per-account leaderboard, and returns a scrubbed snapshot.

> **Note:** a prior per-account dashboard (`devops-day-leaderboard`) already implements the auth + IL-client + sync layers and persists to SQLite with cron-driven sync (attempts every 1–2 min, full sync nightly). We reuse those layers here. Points can be read from `Account.points` (cheap, one walk) or recomputed from `attempts` (prior-project path, enables time-spent + per-activity detail). Choice tracked in [../TODO.md](../TODO.md).

## Sequence

```mermaid
sequenceDiagram
    participant U as Public viewer
    participant FE as React app
    participant PX as Proxy (/api)
    participant IL as api.immersivelabs.online

    U->>FE: open site (no login)
    loop every 30s (pauses if document.hidden)
        FE->>PX: GET /api/leaderboard
        alt cached <10s
            PX-->>FE: cached snapshot
        else stale
            PX->>PX: ensure access token (refresh if expired)
            alt token missing or expired
                PX->>IL: POST /v1/public/tokens (access_key + secret)
                IL-->>PX: accessToken ~30 min
            end
            PX->>IL: GET /v2/accounts?page_token=...
            IL-->>PX: page + nextPageToken
            Note over PX,IL: repeat until null
            opt attempts path if adopted
                PX->>IL: GET /v2/activities paginated
                PX->>IL: GET /v2/attempts paginated
                PX->>PX: per account per activity keep best attempt, account total is sum of bests
            end
            PX->>PX: sort accounts desc by points, tie-break by lastActivityAt, then name
            PX->>PX: scrub PII (drop email by default)
            PX->>PX: cache snapshot
            PX-->>FE: { accounts[], updatedAt }
        end
        FE->>U: render Leaderboard
        alt IL returns 401
            PX->>IL: POST /v1/public/tokens (refresh)
            PX->>IL: retry request
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
      TOK[("access token cache")]
      AGG[Aggregate + sort]
    end
    subgraph IL_API
      A["GET /v2/accounts (paginated)"]
      ACT["GET /v2/activities (optional)"]
      AT["GET /v2/attempts (optional)"]
    end

    UI -->|"GET /api/leaderboard"| CACHE
    CACHE -.miss.-> AGG
    AGG --> A
    AGG -.optional.-> ACT
    AGG -.optional.-> AT
    TOK -.->|"Bearer"| A
    TOK -.->|"Bearer"| ACT
    TOK -.->|"Bearer"| AT
    AGG -->|"ranked accounts"| CACHE
    CACHE -->|"scrubbed JSON"| UI
```

## Auth bootstrap (server-side only)

```mermaid
flowchart TD
    ENV["env IL_ACCESS_KEY + IL_SECRET_TOKEN"] --> PX[Proxy startup]
    PX --> CHK{token cached and fresh}
    CHK -->|yes| USE["use cached accessToken"]
    CHK -->|no| EX["POST /v1/public/tokens"]
    EX --> TK["accessToken ~30 min in memory"]
    TK --> USE
    USE --> CALL["GET /v2/* with Authorization Bearer"]
    CALL -->|"401"| EX
    CALL -->|"2xx"| OUT["return to aggregator"]
```

## Aggregation rules
- `Account.points: null` → treat as `0`.
- Leaderboard total = `Account.points` (v1 minimal) **or**, on the attempts path: for each activity the account has tackled, take the **best** (highest-scoring) attempt only, then sum those per account. Retries do not stack.
- Sort accounts desc by total. Tie-break: `lastActivityAt` asc (earlier finisher wins), then display name.
- Attempts path only: `totalDuration` read with `??` (not `||`) — `0 s` is valid. Orphan attempts (activity 404) are skipped, not fatal.
- Snapshot cached for ~10 s to protect IL rate limits regardless of viewer count.

## Endpoints
**Proxy → browser (public, read-only)**
- `GET /api/leaderboard` — ranked account snapshot `{ accounts: [...], updatedAt }`.
- `GET /api/health` — proxy + token status.

**Proxy → IL (server-side, authenticated)**
- `POST /v1/public/tokens` — token exchange.
- `GET /v2/accounts` — paginated.
- `GET /v2/activities` — paginated (attempts path only).
- `GET /v2/attempts` — paginated (attempts path only).
- Not used: `/v2/teams`, `/v2/teams/{id}/memberships`, deprecated `Account.teams`.

## Security invariants
- No IL credentials or tokens in the JS bundle, HTML, or any response the browser receives.
- No passthrough endpoint that forwards arbitrary IL paths.
- Responses scrubbed: drop PII fields not needed by the UI (keep `displayName`; drop `email` by default).
