import type { FastifyInstance } from 'fastify';
import type { Env } from '../../env.js';
import type { BonusDb } from '../../bonusDb.js';
import { BonusDbError } from '../../bonusDb.js';
import type { LeaderboardAggregator } from '../../aggregate.js';
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
    // Pull latest leaderboard so IL points are current.
    const payload = await aggregator.getLeaderboard();
    const ilByTeam = new Map(payload.teams.map((t) => [t.uuid, t]));
    const rows = bonusDb.getAll();
    return {
      updatedAt: payload.updatedAt,
      teams: rows.map((r) => {
        const il = ilByTeam.get(r.team_id);
        const il_points = il?.il_points ?? 0;
        const bonus_points = r.points;
        const total = il_points + bonus_points;
        return {
          teamId: r.team_id,
          teamName: r.team_name,
          active: r.active === 1,
          il_points,
          bonus_points,
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
    const deltas: { teamId: string; delta: number }[] = [];
    for (const raw of body.updates) {
      if (!raw || typeof raw !== 'object') {
        return reply.code(400).send({ error: 'invalid_body', message: 'each update must be an object' });
      }
      const u = raw as { teamId?: unknown; delta?: unknown };
      if (typeof u.teamId !== 'string' || u.teamId.length === 0) {
        return reply.code(400).send({ error: 'invalid_body', message: 'teamId required' });
      }
      if (typeof u.delta !== 'number' || !Number.isInteger(u.delta)) {
        return reply.code(400).send({ error: 'invalid_body', message: 'delta must be an integer' });
      }
      deltas.push({ teamId: u.teamId, delta: u.delta });
    }

    try {
      const updated = bonusDb.applyBatchDeltas(deltas, 'admin');
      aggregator.invalidate();
      return {
        ok: true,
        updated: updated.map((r) => ({
          teamId: r.team_id,
          teamName: r.team_name,
          bonus_points: r.points,
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
    const payload = await aggregator.getLeaderboard();
    const header = 'team_id,team_name,il_points,bonus_points,total,rank';
    const rows = payload.teams.map((t) =>
      [t.uuid, csvEscape(t.displayName), t.il_points, t.bonus_points, t.total, t.rank].join(','),
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
