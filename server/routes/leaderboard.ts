import type { FastifyInstance } from 'fastify';
import type { LeaderboardAggregator } from '../aggregate.js';

export function registerLeaderboardRoute(app: FastifyInstance, aggregator: LeaderboardAggregator): void {
  app.get('/api/leaderboard', async (_req, reply) => {
    try {
      const payload = await aggregator.getLeaderboard();
      reply.header('cache-control', 'no-store');
      return payload;
    } catch (err) {
      app.log.error({ err }, 'leaderboard rebuild failed');
      return reply.code(503).send({ error: 'upstream_unavailable' });
    }
  });
}
