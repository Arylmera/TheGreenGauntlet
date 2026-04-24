import path from 'node:path';
import type { Env } from '../env.js';
import type { Account } from '../immersivelab/schemas.js';
import type { BonusDb } from '../bonus/bonusDb.js';
import type { TeamBonusRow } from '../bonus/bonus.types.js';
import { JsonStore } from '../snapshotStore.js';
import { phaseFor, rankTeams, toPublicTeam } from './ranking.js';
import type { LeaderboardEvents } from './leaderboardEvents.js';
import type {
  AccountSource,
  EventWindow,
  LeaderboardPayload,
  Phase,
  Team,
} from './types.js';

export type AggregatorDeps = {
  env: Env;
  client: AccountSource;
  now?: () => number;
  bonusDb?: BonusDb;
  events?: LeaderboardEvents;
};

type InternalSnapshot = {
  payload: Omit<LeaderboardPayload, 'teams'> & { teams: Team[] };
  builtAt: number;
};

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
    const bonusByTeamId = this.loadBonusIndex(accounts);

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

  private loadBonusIndex(accounts: Account[]): ReadonlyMap<string, TeamBonusRow> {
    const index = new Map<string, TeamBonusRow>();
    if (!this.bonusDb) return index;
    this.bonusDb.upsertTeamSeeds(
      accounts.map((a) => ({ teamId: a.uuid, teamName: a.displayName })),
    );
    for (const row of this.bonusDb.getAll()) index.set(row.team_id, row);
    return index;
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
