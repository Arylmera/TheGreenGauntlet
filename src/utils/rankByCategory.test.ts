import { describe, expect, it } from 'vitest';
import type { Team } from '../types';
import { rankByCategory } from './rankByCategory';

function team(overrides: Partial<Team> & { displayName: string }): Team {
  return {
    rank: 0,
    uuid: overrides.displayName,
    immersivelab_points: 0,
    il_points: 0,
    mario_points: 0,
    crokinole_points: 0,
    total: 0,
    lastActivityAt: null,
    ...overrides,
  };
}

describe('rankByCategory', () => {
  it('sorts by total descending and assigns ranks 1..N', () => {
    const teams = [
      team({ displayName: 'A', total: 10 }),
      team({ displayName: 'B', total: 30 }),
      team({ displayName: 'C', total: 20 }),
    ];
    const out = rankByCategory(teams, 'total');
    expect(out.map((t) => [t.displayName, t.rank])).toEqual([
      ['B', 1],
      ['C', 2],
      ['A', 3],
    ]);
  });

  it('sorts by mario_points when category is mario', () => {
    const teams = [
      team({ displayName: 'A', mario_points: 5, total: 100 }),
      team({ displayName: 'B', mario_points: 20, total: 10 }),
      team({ displayName: 'C', mario_points: 15, total: 50 }),
    ];
    const out = rankByCategory(teams, 'mario_points');
    expect(out.map((t) => t.displayName)).toEqual(['B', 'C', 'A']);
  });

  it('sorts by crokinole_points independently from total', () => {
    const teams = [
      team({ displayName: 'A', crokinole_points: 0, total: 999 }),
      team({ displayName: 'B', crokinole_points: 7, total: 0 }),
    ];
    const out = rankByCategory(teams, 'crokinole_points');
    expect(out.map((t) => t.displayName)).toEqual(['B', 'A']);
  });

  it('sorts by immersivelab_points (raw, excludes helping)', () => {
    const teams = [
      team({ displayName: 'A', immersivelab_points: 50, il_points: 80 }),
      team({ displayName: 'B', immersivelab_points: 70, il_points: 70 }),
    ];
    const out = rankByCategory(teams, 'immersivelab_points');
    expect(out.map((t) => t.displayName)).toEqual(['B', 'A']);
  });

  it('tiebreaks by total when category scores are equal', () => {
    const teams = [
      team({ displayName: 'A', mario_points: 5, total: 100 }),
      team({ displayName: 'B', mario_points: 5, total: 200 }),
    ];
    const out = rankByCategory(teams, 'mario_points');
    expect(out.map((t) => t.displayName)).toEqual(['B', 'A']);
  });

  it('tiebreaks by earliest activity when scores + total tie', () => {
    const teams = [
      team({
        displayName: 'Later',
        total: 50,
        mario_points: 5,
        lastActivityAt: '2026-04-24T12:00:00Z',
      }),
      team({
        displayName: 'Earlier',
        total: 50,
        mario_points: 5,
        lastActivityAt: '2026-04-24T10:00:00Z',
      }),
    ];
    const out = rankByCategory(teams, 'mario_points');
    expect(out.map((t) => t.displayName)).toEqual(['Earlier', 'Later']);
  });

  it('tiebreaks by displayName when everything else ties', () => {
    const teams = [
      team({ displayName: 'Charlie', total: 10, mario_points: 1 }),
      team({ displayName: 'Alpha', total: 10, mario_points: 1 }),
      team({ displayName: 'Bravo', total: 10, mario_points: 1 }),
    ];
    const out = rankByCategory(teams, 'mario_points');
    expect(out.map((t) => t.displayName)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('treats null lastActivityAt as infinite (ranks after teams with activity)', () => {
    const teams = [
      team({
        displayName: 'NoActivity',
        total: 50,
        mario_points: 5,
        lastActivityAt: null,
      }),
      team({
        displayName: 'HasActivity',
        total: 50,
        mario_points: 5,
        lastActivityAt: '2026-04-24T12:00:00Z',
      }),
    ];
    const out = rankByCategory(teams, 'mario_points');
    expect(out.map((t) => t.displayName)).toEqual(['HasActivity', 'NoActivity']);
  });

  it('does not mutate the input array', () => {
    const teams = [
      team({ displayName: 'A', total: 1 }),
      team({ displayName: 'B', total: 2 }),
    ];
    const snapshot = teams.map((t) => t.displayName);
    rankByCategory(teams, 'total');
    expect(teams.map((t) => t.displayName)).toEqual(snapshot);
  });

  it('returns empty array for empty input', () => {
    expect(rankByCategory([], 'total')).toEqual([]);
  });
});
