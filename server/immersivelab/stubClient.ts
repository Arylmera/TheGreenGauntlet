import type { Account } from './schemas.js';
import type { AccountSource } from '../leaderboard/types.js';

const TEAM_NAMES = [
  'Kernel Panic',
  'Byte Knights',
  'Pipeline Paladins',
  'Rolling Deploys',
  'Merge Conflicts',
  'Sudo Squad',
  'Container Crusaders',
  'Green Gremlins',
  'Shell Shockers',
  'Runtime Rebels',
  'Forklift Friends',
  'Firewall Foxes',
  'Ctrl+Alt+Elite',
  'Null Pointers',
  'Commit Crew',
  'The Segfaulters',
  'Hash Slingers',
  'Patch Panthers',
  'Buffer Barons',
  'Stack Trace Sharks',
  'Cloud Nomads',
  'Rogue Regex',
  'Yaml Yetis',
  'DevOops',
  'The Log Wranglers',
  'CIrcuit Breakers',
  'Latency Ninjas',
  'The 500s',
  'Quantum Queue',
  'Rubber Ducks',
];

export type StubDeps = {
  now?: () => number;
  seed?: number;
};

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class StubAccountSource implements AccountSource {
  private readonly now: () => number;
  private readonly startedAt: number;
  private readonly rates: number[];

  constructor(deps: StubDeps = {}) {
    this.now = deps.now ?? (() => Date.now());
    this.startedAt = this.now();
    const rand = mulberry32(deps.seed ?? 42);
    this.rates = TEAM_NAMES.map(() => 300 + rand() * 700);
  }

  async *walkAccounts(): AsyncIterable<Account> {
    const elapsedHours = Math.max(0, (this.now() - this.startedAt) / 3_600_000);
    const jitterRand = mulberry32(Math.floor(this.now() / 10_000));
    for (let i = 0; i < TEAM_NAMES.length; i++) {
      const rate = this.rates[i] ?? 500;
      const jitter = (jitterRand() - 0.5) * 80;
      const points = Math.max(0, Math.round(rate * elapsedHours + jitter));
      const lastActivityAt =
        points > 0 ? new Date(this.now() - (i + 1) * 15_000).toISOString() : null;
      yield {
        uuid: `stub-${i + 1}`,
        displayName: TEAM_NAMES[i] ?? `Team ${i + 1}`,
        points,
        lastActivityAt,
      };
    }
  }
}
