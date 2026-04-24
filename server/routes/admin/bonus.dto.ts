import type { TeamBonusRow } from '../../bonus/bonus.types.js';
import type { Team } from '../../leaderboard/types.js';

export type AdminBonusTeamDto = {
  teamId: string;
  teamName: string;
  active: boolean;
  immersivelab_points: number;
  helping_points: number;
  mario_points: number;
  crokinole_points: number;
  il_points: number;
  total: number;
  updated_at: string;
  updated_by: string | null;
};

export type BatchUpdateDto = {
  teamId: string;
  teamName: string;
  mario_points: number;
  crokinole_points: number;
  helping_points: number;
  active: boolean;
  updated_at: string;
};

export function toAdminBonusTeamDto(
  row: TeamBonusRow,
  team: Team | undefined,
): AdminBonusTeamDto {
  const immersivelab_points = team?.immersivelab_points ?? 0;
  const il_points = immersivelab_points + row.helping_points;
  const total = il_points + row.mario_points + row.crokinole_points;
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    active: row.active === 1,
    immersivelab_points,
    helping_points: row.helping_points,
    mario_points: row.mario_points,
    crokinole_points: row.crokinole_points,
    il_points,
    total,
    updated_at: row.updated_at,
    updated_by: row.updated_by,
  };
}

export function toBatchUpdateDto(row: TeamBonusRow): BatchUpdateDto {
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    mario_points: row.mario_points,
    crokinole_points: row.crokinole_points,
    helping_points: row.helping_points,
    active: row.active === 1,
    updated_at: row.updated_at,
  };
}
