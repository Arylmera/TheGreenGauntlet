import type { FastifyInstance } from 'fastify';
import type { Env } from '../../env.js';
import type { BonusDb, BonusCategory } from '../../bonusDb.js';
import { BonusDbError, isBonusCategory } from '../../bonusDb.js';
import type { LeaderboardAggregator, Team } from '../../aggregate.js';
import { requireAdmin } from './auth.js';

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
      teams: rows.map((r) => {
        const team = teamByUuid.get(r.team_id);
        const immersivelab_points = team?.immersivelab_points ?? 0;
        const helping_points = r.helping_points;
        const mario_points = r.mario_points;
        const crokinole_points = r.crokinole_points;
        const il_points = immersivelab_points + helping_points;
        const total = il_points + mario_points + crokinole_points;
        return {
          teamId: r.team_id,
          teamName: r.team_name,
          active: r.active === 1,
          immersivelab_points,
          helping_points,
          mario_points,
          crokinole_points,
          il_points,
          total,
          updated_at: r.updated_at,
          updated_by: r.updated_by,
        };
      }),
    };
  });

  app.post('/api/admin/bonus/batch', { preHandler: auth }, async (req, reply) => {
    const body = (req.body ?? {}) as { updates?: unknown };
    if (!Array.isArray(body.updates)) {
      return reply.code(400).send({ error: 'invalid_body', message: 'updates must be an array' });
    }
    const deltas: { teamId: string; category: BonusCategory; delta: number }[] = [];
    for (const raw of body.updates) {
      if (!raw || typeof raw !== 'object') {
        return reply.code(400).send({ error: 'invalid_body', message: 'each update must be an object' });
      }
      const u = raw as { teamId?: unknown; category?: unknown; delta?: unknown };
      if (typeof u.teamId !== 'string' || u.teamId.length === 0) {
        return reply.code(400).send({ error: 'invalid_body', message: 'teamId required' });
      }
      if (!isBonusCategory(u.category)) {
        return reply
          .code(400)
          .send({ error: 'invalid_body', message: 'category must be one of mario | crokinole | helping' });
      }
      if (typeof u.delta !== 'number' || !Number.isInteger(u.delta)) {
        return reply.code(400).send({ error: 'invalid_body', message: 'delta must be an integer' });
      }
      deltas.push({ teamId: u.teamId, category: u.category, delta: u.delta });
    }

    try {
      const updated = bonusDb.applyBatchDeltas(deltas, 'admin');
      aggregator.invalidate();
      return {
        ok: true,
        updated: updated.map((r) => ({
          teamId: r.team_id,
          teamName: r.team_name,
          mario_points: r.mario_points,
          crokinole_points: r.crokinole_points,
          helping_points: r.helping_points,
          active: r.active === 1,
          updated_at: r.updated_at,
        })),
      };
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
    const body = (req.body ?? {}) as { active?: unknown };
    if (typeof body.active !== 'boolean') {
      return reply.code(400).send({ error: 'invalid_body', message: 'active must be boolean' });
    }
    try {
      const row = bonusDb.setActive(params.teamId, body.active, 'admin');
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

  app.get('/api/admin/export.csv', { preHandler: auth }, async (_req, reply) => {
    const admin = await aggregator.getAdminTeams();
    const header =
      'team_id,team_name,immersivelab_points,helping_points,mario_points,crokinole_points,total,rank';
    const rows = admin.teams.map((t) =>
      [
        t.uuid,
        csvEscape(t.displayName),
        t.immersivelab_points,
        t.helping_points,
        t.mario_points,
        t.crokinole_points,
        t.total,
        t.rank,
      ].join(','),
    );
    reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', 'attachment; filename="standings.csv"');
    return [header, ...rows].join('\n') + '\n';
  });
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
