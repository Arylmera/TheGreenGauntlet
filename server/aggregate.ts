import path from 'node:path';
import type { Env } from './env.js';
import type { Account } from './immersiveLab.js';
import { JsonStore } from './snapshotStore.js';

export type Phase = 'pre' | 'live' | 'ended';

export type Team = {
  rank: number;
  uuid: string;
  displayName: string;
  points: number;
  lastActivityAt: string | null;
};

export type AccountSource = {
  walkAccounts(): AsyncIterable<Account>;
};

export type LeaderboardPayload = {
  updatedAt: string;
  phase: Phase;
  eventWindow: { startAt: string; endAt: string };
  teams: Team[];
};

export function phaseFor(now: number, env: Env): Phase {
  const start = Date.parse(env.EVENT_START_AT);
  const end = Date.parse(env.EVENT_END_AT);
  if (now < start) return 'pre';
  if (now > end) return 'ended';
  return 'live';
}

export function rankTeams(accounts: Account[]): Team[] {
  const sorted = accounts
    .map((a) => ({
      uuid: a.uuid,
      displayName: a.displayName,
      points: a.points ?? 0,
      lastActivityAt: a.lastActivityAt ?? null,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aLast = a.lastActivityAt ? Date.parse(a.lastActivityAt) : Number.POSITIVE_INFINITY;
      const bLast = b.lastActivityAt ? Date.parse(b.lastActivityAt) : Number.POSITIVE_INFINITY;
      if (aLast !== bLast) return aLast - bLast;
      return a.displayName.localeCompare(b.displayName);
    });
  return sorted.map((t, i) => ({ rank: i + 1, ...t }));
}

export type AggregatorDeps = {
  env: Env;
  client: AccountSource;
  now?: () => number;
};

type Snapshot = { payload: LeaderboardPayload; builtAt: number };

export class LeaderboardAggregator {
  private readonly env: Env;
  private readonly client: AccountSource;
  private readonly now: () => number;
  private readonly store: JsonStore<Snapshot>;
  private snapshot: Snapshot | null = null;
  private inflight: Promise<LeaderboardPayload> | null = null;

  constructor(deps: AggregatorDeps) {
    this.env = deps.env;
    this.client = deps.client;
    this.now = deps.now ?? (() => Date.now());
    this.store = new JsonStore<Snapshot>(path.join(this.env.DATA_DIR, 'snapshot.json'));
  }

  async init(): Promise<void> {
    this.snapshot = await this.store.load();
  }

  snapshotAgeMs(): number | null {
    return this.snapshot ? this.now() - this.snapshot.builtAt : null;
  }

  async getLeaderboard(): Promise<LeaderboardPayload> {
    const phase = phaseFor(this.now(), this.env);

    if (phase === 'pre') {
      return this.emptyPayload('pre');
    }

    if (phase === 'ended' && this.snapshot) {
      return { ...this.snapshot.payload, phase: 'ended' };
    }

    if (this.snapshot && this.now() - this.snapshot.builtAt < this.env.SNAPSHOT_TTL_MS) {
      return this.snapshot.payload;
    }

    if (this.inflight) return this.inflight;

    this.inflight = this.rebuild().finally(() => {
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
    const accounts: Account[] = [];
    for await (const account of this.client.walkAccounts()) accounts.push(account);
    const teams = rankTeams(accounts);
    const payload: LeaderboardPayload = {
      updatedAt: new Date(this.now()).toISOString(),
      phase: phaseFor(this.now(), this.env),
      eventWindow: { startAt: this.env.EVENT_START_AT, endAt: this.env.EVENT_END_AT },
      teams,
    };
    const snapshot: Snapshot = { payload, builtAt: this.now() };
    this.snapshot = snapshot;
    await this.store.save(snapshot);
    return payload;
  }

  private emptyPayload(phase: Phase): LeaderboardPayload {
    return {
      updatedAt: new Date(this.now()).toISOString(),
      phase,
      eventWindow: { startAt: this.env.EVENT_START_AT, endAt: this.env.EVENT_END_AT },
      teams: [],
    };
  }
}
