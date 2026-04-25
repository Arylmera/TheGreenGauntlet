import type { FastifyInstance } from 'fastify';
import type { Env } from '../../env.js';
import type { BonusDb } from '../../bonus/db.js';
import type { LeaderboardAggregator } from '../../leaderboard/aggregator.js';
import { requireAdmin } from './auth.js';

export const ANNOUNCEMENT_MAX_LENGTH = 280;

export type AdminAnnouncementDeps = {
  env: Env;
  bonusDb: BonusDb;
  aggregator: LeaderboardAggregator;
};

type AnnouncementDto = {
  message: string | null;
  messageId: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

function toDto(row: ReturnType<BonusDb['getAnnouncement']>): AnnouncementDto {
  return {
    message: row.message,
    messageId: row.messageId,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export function registerAdminAnnouncementRoutes(
  app: FastifyInstance,
  deps: AdminAnnouncementDeps,
): void {
  const { env, bonusDb, aggregator } = deps;
  const auth = requireAdmin(env);

  app.get('/api/admin/announcement', { preHandler: auth }, async () => toDto(bonusDb.getAnnouncement()));

  app.put('/api/admin/announcement', { preHandler: auth }, async (req, reply) => {
    const body = (req.body ?? {}) as { message?: unknown };
    if (typeof body.message !== 'string') {
      return reply
        .code(400)
        .send({ error: 'INVALID', message: 'message must be a string' });
    }
    if (body.message.length > ANNOUNCEMENT_MAX_LENGTH) {
      return reply.code(400).send({
        error: 'TOO_LONG',
        message: `message exceeds ${ANNOUNCEMENT_MAX_LENGTH} characters`,
      });
    }
    const next = bonusDb.setAnnouncement(body.message, 'admin');
    aggregator.invalidate();
    return toDto(next);
  });

  app.delete('/api/admin/announcement', { preHandler: auth }, async () => {
    const next = bonusDb.setAnnouncement(null, 'admin');
    aggregator.invalidate();
    return toDto(next);
  });
}

export function registerPublicAnnouncementRoute(
  app: FastifyInstance,
  bonusDb: BonusDb,
): void {
  app.get('/api/announcement', async (_req, reply) => {
    reply.header('cache-control', 'no-store');
    return toDto(bonusDb.getAnnouncement());
  });
}
