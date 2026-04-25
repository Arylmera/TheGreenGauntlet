import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import type { Env } from './env.js';
import { LeaderboardAggregator } from './leaderboard/aggregator.js';
import type { AccountSource } from './leaderboard/types.js';
import type { LeaderboardEvents } from './leaderboard/events.js';
import type { BonusDb } from './bonus/db.js';
import { registerHealthRoute } from './routes/health.js';
import { registerLeaderboardRoute } from './routes/leaderboard.js';
import { registerAdminAuthRoutes } from './routes/admin/auth.js';
import { registerAdminBonusRoutes } from './routes/admin/bonus.js';
import {
  registerAdminAnnouncementRoutes,
  registerPublicAnnouncementRoute,
} from './routes/admin/announcement.js';
import { registerAdminExportRoutes } from './routes/admin/exportCsv.js';

export type AppDeps = {
  env: Env;
  client: AccountSource;
  aggregator: LeaderboardAggregator;
  bonusDb?: BonusDb;
  events?: LeaderboardEvents;
  serveStatic?: boolean;
};

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  // Same-origin deployment: the Node process serves both the React bundle and
  // /api routes (see docs/data-flow.md). No CORS plugin is registered by design —
  // Fastify emits no Access-Control-Allow-Origin header, so cross-origin reads
  // are blocked by the browser. Introducing a cross-origin client would require
  // registering @fastify/cors with an explicit allowlist.
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
    registerAdminAnnouncementRoutes(app, {
      env: deps.env,
      bonusDb: deps.bonusDb,
      aggregator: deps.aggregator,
    });
    registerPublicAnnouncementRoute(app, deps.bonusDb);
  }
  registerAdminExportRoutes(app, { env: deps.env, aggregator: deps.aggregator });

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
