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
  points: number;
  il_points: number;
  bonus_points: number;
  total: number;
  lastActivityAt: string | null;
};

export type AccountSource = {
  walkAccounts(): AsyncIterable<Account>;
};

export type EventWindow = { startAt: string; endAt: string };

export type LeaderboardPayload = {
  updatedAt: string;
  phase: Phase;
  eventWindow: EventWindow;
  teams: Team[];
};

export type AggregatorDeps = {
  env: Env;
  client: AccountSource;
  now?: () => number;
  bonusDb?: BonusDb;
  events?: LeaderboardEvents;
};

type TeamDraft = Omit<Team, 'rank'>;
type Snapshot = { payload: LeaderboardPayload; builtAt: number };

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
    // Exclude inactive teams entirely.
    if (bonus && bonus.active === 0) continue;
    const il = a.points ?? 0;
    const bp = bonus ? bonus.points : 0;
    drafts.push({
      uuid: a.uuid,
      displayName: a.displayName,
      points: il + bp,
      il_points: il,
      bonus_points: bp,
      total: il + bp,
      lastActivityAt: a.lastActivityAt ?? null,
    });
  }
  return drafts.sort(compareTeams).map(assignRank);
}

// Higher total first; earlier activity breaks ties; null activity sorts last.
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

export class LeaderboardAggregator {
  private readonly env: Env;
  private readonly client: AccountSource;
  private readonly now: () => number;
  private readonly store: JsonStore<Snapshot>;
  private readonly bonusDb: BonusDb | undefined;
  private readonly events: LeaderboardEvents | undefined;
  private snapshot: Snapshot | null = null;
  private inflight: Promise<LeaderboardPayload> | null = null;

  constructor(deps: AggregatorDeps) {
    this.env = deps.env;
    this.client = deps.client;
    this.now = deps.now ?? (() => Date.now());
    this.store = new JsonStore<Snapshot>(path.join(this.env.DATA_DIR, 'snapshot.json'));
    this.bonusDb = deps.bonusDb;
    this.events = deps.events;
  }

  async init(): Promise<void> {
    this.snapshot = await this.store.load();
  }

  snapshotAgeMs(): number | null {
    return this.snapshot ? this.now() - this.snapshot.builtAt : null;
  }

  /** Bust cached snapshot and emit SSE update. Called after admin writes. */
  invalidate(): void {
    this.snapshot = null;
    this.events?.emitUpdate();
  }

  async getLeaderboard(): Promise<LeaderboardPayload> {
    const phase = phaseFor(this.now(), this.env);

    if (phase === 'pre') return this.emptyPayload('pre');
    if (phase === 'ended' && this.snapshot) {
      return { ...this.snapshot.payload, phase: 'ended' };
    }
    if (this.isSnapshotFresh()) return this.snapshot!.payload;

    return this.rebuildWithFallback();
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
      if (this.snapshot) return this.snapshot.payload;
      throw err;
    }
  }

  private async rebuild(): Promise<LeaderboardPayload> {
    const accounts = await this.collectAccounts();

    // Seed bonus rows for all known teams on every tick.
    if (this.bonusDb) {
      this.bonusDb.upsertTeamSeeds(
        accounts.map((a) => ({ teamId: a.uuid, teamName: a.displayName })),
      );
    }
    const bonusByTeamId = new Map<string, TeamBonusRow>();
    if (this.bonusDb) {
      for (const row of this.bonusDb.getAll()) bonusByTeamId.set(row.team_id, row);
    }

    const payload: LeaderboardPayload = {
      updatedAt: new Date(this.now()).toISOString(),
      phase: phaseFor(this.now(), this.env),
      eventWindow: this.eventWindow(),
      teams: rankTeams(accounts, bonusByTeamId),
    };
    const snapshot: Snapshot = { payload, builtAt: this.now() };
    this.snapshot = snapshot;
    await this.store.save(snapshot);
    return payload;
  }

  private async collectAccounts(): Promise<Account[]> {
    const accounts: Account[] = [];
    for await (const account of this.client.walkAccounts()) accounts.push(account);
    return accounts;
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
