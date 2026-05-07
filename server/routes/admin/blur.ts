import type { FastifyInstance } from 'fastify';
import type { Env } from '../../env.js';
import type { BonusDb } from '../../bonus/db.js';
import type { LeaderboardAggregator } from '../../leaderboard/aggregator.js';
import { requireAdmin } from './auth.js';

export type AdminBlurDeps = {
  env: Env;
  bonusDb: BonusDb;
  aggregator: LeaderboardAggregator;
};

type BlurDto = {
  blurPoints: boolean;
  updatedAt: string;
  updatedBy: string | null;
};

export function registerAdminBlurRoutes(
  app: FastifyInstance,
  deps: AdminBlurDeps,
): void {
  const { env, bonusDb, aggregator } = deps;
  const auth = requireAdmin(env);

  app.get('/api/admin/blur', { preHandler: auth }, async (): Promise<BlurDto> => {
    return bonusDb.getBlurPoints();
  });

  app.put('/api/admin/blur', { preHandler: auth }, async (req, reply) => {
    const body = (req.body ?? {}) as { blurPoints?: unknown };
    if (typeof body.blurPoints !== 'boolean') {
      return reply
        .code(400)
        .send({ error: 'INVALID', message: 'blurPoints must be a boolean' });
    }
    const next = bonusDb.setBlurPoints(body.blurPoints, 'admin');
    aggregator.invalidate();
    return next satisfies BlurDto;
  });
}
