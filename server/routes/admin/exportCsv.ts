import type { FastifyInstance } from 'fastify';
import type { Env } from '../../env.js';
import type { LeaderboardAggregator } from '../../leaderboard/aggregator.js';
import { requireAdmin } from './auth.js';

export type AdminExportDeps = {
  env: Env;
  aggregator: LeaderboardAggregator;
};

export function registerAdminExportRoutes(app: FastifyInstance, deps: AdminExportDeps): void {
  const auth = requireAdmin(deps.env);

  app.get('/api/admin/export.csv', { preHandler: auth }, async (_req, reply) => {
    const admin = await deps.aggregator.getAdminTeams();
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
