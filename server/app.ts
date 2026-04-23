import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import type { Env } from './env.js';
import { LeaderboardAggregator, type AccountSource } from './aggregate.js';
import { registerHealthRoute } from './routes/health.js';
import { registerLeaderboardRoute } from './routes/leaderboard.js';
import { registerAdminAuthRoutes } from './routes/admin/auth.js';
import { registerAdminBonusRoutes } from './routes/admin/bonus.js';
import type { BonusDb } from './bonusDb.js';
import type { LeaderboardEvents } from './leaderboardEvents.js';

export type AppDeps = {
  env: Env;
  client: AccountSource;
  aggregator: LeaderboardAggregator;
  bonusDb?: BonusDb;
  events?: LeaderboardEvents;
  serveStatic?: boolean;
};

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: deps.env.LOG_LEVEL },
    disableRequestLogging: false,
  });

  registerHealthRoute(app, deps.env, deps.aggregator);
  registerLeaderboardRoute(app, deps.aggregator, deps.events);
  registerAdminAuthRoutes(app, deps.env);
  if (deps.bonusDb) {
    registerAdminBonusRoutes(app, {
      env: deps.env,
      bonusDb: deps.bonusDb,
      aggregator: deps.aggregator,
    });
  }

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'not_found' });
    if (deps.serveStatic) return reply.sendFile('index.html');
    return reply.code(404).send({ error: 'not_found' });
  });

  if (deps.serveStatic) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const distRoot = path.resolve(here, '..', 'dist');
    await app.register(fastifyStatic, { root: distRoot, prefix: '/', wildcard: false });
  }

  return app;
}
