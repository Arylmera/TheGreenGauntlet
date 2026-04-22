import type { FastifyInstance } from 'fastify';
import type { Env } from '../env.js';
import { phaseFor, type LeaderboardAggregator } from '../aggregate.js';

export function registerHealthRoute(
  app: FastifyInstance,
  env: Env,
  aggregator: LeaderboardAggregator,
): void {
  app.get('/api/health', async () => ({
    ok: true,
    snapshotAgeMs: aggregator.snapshotAgeMs(),
    eventWindow: {
      startAt: env.EVENT_START_AT,
      endAt: env.EVENT_END_AT,
      phase: phaseFor(Date.now(), env),
    },
  }));
}
