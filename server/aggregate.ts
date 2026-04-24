import path from 'node:path';
import type { Env } from './env.js';
import type { Account } from './immersiveLab.js';
import { JsonStore } from './snapshotStore.js';
import type { BonusDb, TeamBonusRow } from './bonusDb.js';
import type { LeaderboardEvents } from './leaderboardEvents.js';

export type Phase = 'pre' | 'live' | 'ended';

export type Team = {
  rank: number;
  uuid: string;
  displayName: string;
  /** Raw Immersive Labs `Account.points`. Admin-only; not on the public wire. */
  immersivelab_points: number;
  /** Bonus helping points. Admin-only; not on the public wire (merged into il_points). */
  helping_points: number;
  /** Public column: `immersivelab_points + helping_points`. */
  il_points: number;
  mario_points: number;
  crokinole_points: number;
  total: number;
  lastActivityAt: string | null;
};

/** Shape emitted to the public dashboard — helping bonus scrubbed.
 *  `immersivelab_points` (raw IL without helping) is exposed so the client
 *  can sort an "Immersive Lab only" view that excludes the helping bonus.
 *  `il_points` remains `immersivelab_points + helping_points`. */
export type PublicTeam = Omit<Team, 'helping_points'>;

export type AccountSource = {
  walkAccounts(): AsyncIterable<Account>;
};

export type EventWindow = { startAt: string; endAt: string };

export type LeaderboardPayload = {
  updatedAt: string;
  phase: Phase;
  eventWindow: EventWindow;
  teams: PublicTeam[];
};

export type AggregatorDeps = {
  env: Env;
  client: AccountSource;
  now?: () => number;
  bonusDb?: BonusDb;
  events?: LeaderboardEvents;
};

type TeamDraft = Omit<Team, 'rank'>;
type InternalSnapshot = {
  payload: Omit<LeaderboardPayload, 'teams'> & { teams: Team[] };
  builtAt: number;
};

export function phaseFor(now: number, env: Env): Phase {
  const start = Date.parse(env.EVENT_START_AT);
  const end = Date.parse(env.EVENT_END_AT);
  if (now < start) return 'pre';
  if (now > end) return 'ended';
  return 'live';
}

export function rankTeams(
  accounts: Account[],
  bonusByTeamId: ReadonlyMap<string, TeamBonusRow> = new Map(),
): Team[] {
  const drafts: TeamDraft[] = [];
  for (const a of accounts) {
    const bonus = bonusByTeamId.get(a.uuid);
    if (bonus && bonus.active === 0) continue;
    const raw = a.points ?? 0;
    const helping = bonus ? bonus.helping_points : 0;
    const mario = bonus ? bonus.mario_points : 0;
    const crokinole = bonus ? bonus.crokinole_points : 0;
    const il = raw + helping;
    drafts.push({
      uuid: a.uuid,
      displayName: a.displayName,
      immersivelab_points: raw,
      helping_points: helping,
      il_points: il,
      mario_points: mario,
      crokinole_points: crokinole,
      total: il + mario + crokinole,
      lastActivityAt: a.lastActivityAt ?? null,
    });
  }
  return drafts.sort(compareTeams).map(assignRank);
}

function compareTeams(a: TeamDraft, b: TeamDraft): number {
  if (b.total !== a.total) return b.total - a.total;
  const aLast = parseActivity(a.lastActivityAt);
  const bLast = parseActivity(b.lastActivityAt);
  if (aLast !== bLast) return aLast - bLast;
  return a.displayName.localeCompare(b.displayName);
}

function parseActivity(iso: string | null): number {
  return iso ? Date.parse(iso) : Number.POSITIVE_INFINITY;
}

function assignRank(draft: TeamDraft, i: number): Team {
  return { rank: i + 1, ...draft };
}

function toPublicTeam(t: Team): PublicTeam {
  const { helping_points: _help, ...rest } = t;
  return rest;
}

export class LeaderboardAggregator {
  private readonly env: Env;
  private readonly client: AccountSource;
  private readonly now: () => number;
  private readonly store: JsonStore<InternalSnapshot>;
  private readonly bonusDb: BonusDb | undefined;
  private readonly events: LeaderboardEvents | undefined;
  private snapshot: InternalSnapshot | null = null;
  private inflight: Promise<LeaderboardPayload> | null = null;

  constructor(deps: AggregatorDeps) {
    this.env = deps.env;
    this.client = deps.client;
    this.now = deps.now ?? (() => Date.now());
    this.store = new JsonStore<InternalSnapshot>(path.join(this.env.DATA_DIR, 'snapshot.json'));
    this.bonusDb = deps.bonusDb;
    this.events = deps.events;
  }

  async init(): Promise<void> {
    this.snapshot = await this.store.load();
  }

  snapshotAgeMs(): number | null {
    return this.snapshot ? this.now() - this.snapshot.builtAt : null;
  }

  /** Bust cached snapshot, rebuild in background, and push fresh payload to SSE clients. */
  invalidate(): void {
    this.snapshot = null;
    if (!this.events) return;
    void this.rebuildWithFallback()
      .then((payload) => this.events?.emitUpdate(payload))
      .catch(() => {
        // Swallow: next client request will retry. SSE clients keep last known state.
      });
  }

  async getLeaderboard(): Promise<LeaderboardPayload> {
    const phase = phaseFor(this.now(), this.env);

    if (phase === 'pre') return this.emptyPayload('pre');
    if (phase === 'ended' && this.snapshot) {
      return this.toPublicPayload({ ...this.snapshot.payload, phase: 'ended' });
    }
    if (this.isSnapshotFresh()) return this.toPublicPayload(this.snapshot!.payload);

    return this.rebuildWithFallback();
  }

  /**
   * Admin-only accessor: returns the full team list including `immersivelab_points`
   * and `helping_points`. Triggers a rebuild/cache-hit the same way the public
   * route does.
   */
  async getAdminTeams(): Promise<{ updatedAt: string; teams: Team[] }> {
    await this.getLeaderboard();
    if (!this.snapshot) return { updatedAt: new Date(this.now()).toISOString(), teams: [] };
    return {
      updatedAt: this.snapshot.payload.updatedAt,
      teams: this.snapshot.payload.teams,
    };
  }

  private isSnapshotFresh(): boolean {
    if (!this.snapshot) return false;
    return this.now() - this.snapshot.builtAt < this.env.SNAPSHOT_TTL_MS;
  }

  private async rebuildWithFallback(): Promise<LeaderboardPayload> {
    this.inflight ??= this.rebuild().finally(() => {
      this.inflight = null;
    });
    try {
      return await this.inflight;
    } catch (err) {
      if (this.snapshot) return this.toPublicPayload(this.snapshot.payload);
      throw err;
    }
  }

  private async rebuild(): Promise<LeaderboardPayload> {
    const accounts = await this.collectAccounts();

    if (this.bonusDb) {
      this.bonusDb.upsertTeamSeeds(
        accounts.map((a) => ({ teamId: a.uuid, teamName: a.displayName })),
      );
    }
    const bonusByTeamId = new Map<string, TeamBonusRow>();
    if (this.bonusDb) {
      for (const row of this.bonusDb.getAll()) bonusByTeamId.set(row.team_id, row);
    }

    const internalPayload = {
      updatedAt: new Date(this.now()).toISOString(),
      phase: phaseFor(this.now(), this.env),
      eventWindow: this.eventWindow(),
      teams: rankTeams(accounts, bonusByTeamId),
    };
    const snapshot: InternalSnapshot = { payload: internalPayload, builtAt: this.now() };
    this.snapshot = snapshot;
    await this.store.save(snapshot);
    return this.toPublicPayload(internalPayload);
  }

  private async collectAccounts(): Promise<Account[]> {
    const accounts: Account[] = [];
    for await (const account of this.client.walkAccounts()) accounts.push(account);
    return accounts;
  }

  private toPublicPayload(internal: InternalSnapshot['payload']): LeaderboardPayload {
    return {
      updatedAt: internal.updatedAt,
      phase: internal.phase,
      eventWindow: internal.eventWindow,
      teams: internal.teams.map(toPublicTeam),
    };
  }

  private emptyPayload(phase: Phase): LeaderboardPayload {
    return {
      updatedAt: new Date(this.now()).toISOString(),
      phase,
      eventWindow: this.eventWindow(),
      teams: [],
    };
  }

  private eventWindow(): EventWindow {
    return { startAt: this.env.EVENT_START_AT, endAt: this.env.EVENT_END_AT };
  }
}
