import type { FastifyInstance } from 'fastify';
import type { LeaderboardAggregator } from '../leaderboard/aggregator.js';
import type { LeaderboardEvents } from '../leaderboard/events.js';

const SSE_KEEPALIVE_MS = 25_000;

export function registerLeaderboardRoute(
  app: FastifyInstance,
  aggregator: LeaderboardAggregator,
  events?: LeaderboardEvents,
): void {
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

  if (!events) return;

  app.get('/api/leaderboard/stream', async (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(': connected\n\n');

    try {
      const initial = await aggregator.getLeaderboard();
      reply.raw.write(`event: leaderboard-updated\n`);
      reply.raw.write(`data: ${JSON.stringify(initial)}\n\n`);
    } catch {
      // Initial snapshot unavailable; client will fall back to its poll.
    }

    const unsubscribe = events.onUpdate((payload) => {
      reply.raw.write(`event: leaderboard-updated\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    });

    const keepalive = setInterval(() => {
      reply.raw.write(`: keepalive\n\n`);
    }, SSE_KEEPALIVE_MS);

    const cleanup = (): void => {
      clearInterval(keepalive);
      unsubscribe();
      reply.raw.end();
    };
    req.raw.on('close', cleanup);
    req.raw.on('error', cleanup);
  });
}
