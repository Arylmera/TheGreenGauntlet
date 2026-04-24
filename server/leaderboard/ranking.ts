import type { Env } from '../env.js';
import type { Account } from '../immersivelab/schemas.js';
import type { TeamBonusRow } from '../bonus/bonus.types.js';
import type { Phase, PublicTeam, Team } from './types.js';

type TeamDraft = Omit<Team, 'rank'>;

export function phaseFor(now: number, env: Env): Phase {
  const start = Date.parse(env.EVENT_START_AT);
  const end = Date.parse(env.EVENT_END_AT);
  if (now < start) return 'pre';
  if (now > end) return 'ended';
  return 'live';
}

export function rankTeams(
  accounts: Account[],
  bonusByTeamId: ReadonlyMap<string, TeamBonusRow> = new Map(),
): Team[] {
  const drafts: TeamDraft[] = [];
  for (const a of accounts) {
    const bonus = bonusByTeamId.get(a.uuid);
    if (bonus && bonus.active === 0) continue;
    const raw = a.points ?? 0;
    const helping = bonus ? bonus.helping_points : 0;
    const mario = bonus ? bonus.mario_points : 0;
    const crokinole = bonus ? bonus.crokinole_points : 0;
    const il = raw + helping;
    drafts.push({
      uuid: a.uuid,
      displayName: a.displayName,
      immersivelab_points: raw,
      helping_points: helping,
      il_points: il,
      mario_points: mario,
      crokinole_points: crokinole,
      total: il + mario + crokinole,
      lastActivityAt: a.lastActivityAt ?? null,
    });
  }
  return drafts.sort(compareTeams).map(assignRank);
}

export function toPublicTeam(t: Team): PublicTeam {
  const { helping_points: _help, ...rest } = t;
  return rest;
}

function compareTeams(a: TeamDraft, b: TeamDraft): number {
  if (b.total !== a.total) return b.total - a.total;
  const aLast = parseActivity(a.lastActivityAt);
  const bLast = parseActivity(b.lastActivityAt);
  if (aLast !== bLast) return aLast - bLast;
  return a.displayName.localeCompare(b.displayName);
}

function parseActivity(iso: string | null): number {
  return iso ? Date.parse(iso) : Number.POSITIVE_INFINITY;
}

function assignRank(draft: TeamDraft, i: number): Team {
  return { rank: i + 1, ...draft };
}
