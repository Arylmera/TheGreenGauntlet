import type { FastifyInstance } from 'fastify';
import type { Env } from '../../env.js';
import type { BonusDb } from '../../bonus/bonusDb.js';
import { BonusDbError } from '../../bonus/bonus.types.js';
import type { LeaderboardAggregator } from '../../leaderboard/aggregator.js';
import type { Team } from '../../leaderboard/types.js';
import { requireAdmin } from './auth.js';
import { toAdminBonusTeamDto, toBatchUpdateDto } from './bonus.dto.js';
import { parseActiveBody, parseBatchBody } from './bonus.validation.js';

export type AdminBonusDeps = {
  env: Env;
  bonusDb: BonusDb;
  aggregator: LeaderboardAggregator;
};

export function registerAdminBonusRoutes(app: FastifyInstance, deps: AdminBonusDeps): void {
  const { env, bonusDb, aggregator } = deps;
  const auth = requireAdmin(env);

  app.get('/api/admin/bonus', { preHandler: auth }, async () => {
    const admin = await aggregator.getAdminTeams();
    const teamByUuid = new Map<string, Team>(admin.teams.map((t) => [t.uuid, t]));
    const rows = bonusDb.getAll();
    return {
      updatedAt: admin.updatedAt,
      teams: rows.map((r) => toAdminBonusTeamDto(r, teamByUuid.get(r.team_id))),
    };
  });

  app.post('/api/admin/bonus/batch', { preHandler: auth }, async (req, reply) => {
    const parsed = parseBatchBody(req.body);
    if (!parsed.ok) {
      return reply.code(parsed.error.status).send({
        error: parsed.error.error,
        message: parsed.error.message,
      });
    }

    try {
      const updated = bonusDb.applyBatchDeltas(parsed.deltas, 'admin');
      aggregator.invalidate();
      return { ok: true, updated: updated.map(toBatchUpdateDto) };
    } catch (err) {
      if (err instanceof BonusDbError) {
        const status = err.code === 'NEGATIVE_TOTAL' ? 409 : 400;
        return reply.code(status).send({ error: err.code, message: err.message });
      }
      throw err;
    }
  });

  app.patch('/api/admin/bonus/:teamId/active', { preHandler: auth }, async (req, reply) => {
    const params = req.params as { teamId: string };
    const parsed = parseActiveBody(req.body);
    if (!parsed.ok) {
      return reply.code(parsed.error.status).send({
        error: parsed.error.error,
        message: parsed.error.message,
      });
    }
    try {
      const row = bonusDb.setActive(params.teamId, parsed.active, 'admin');
      aggregator.invalidate();
      return {
        ok: true,
        teamId: row.team_id,
        active: row.active === 1,
        updated_at: row.updated_at,
      };
    } catch (err) {
      if (err instanceof BonusDbError) {
        return reply.code(404).send({ error: err.code, message: err.message });
      }
      throw err;
    }
  });
}
