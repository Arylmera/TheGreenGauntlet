import { isBonusCategory, type BonusDelta } from '../../bonus/bonus.types.js';

export type ValidationError = { status: 400; error: 'invalid_body'; message: string };

export function parseBatchBody(
  body: unknown,
): { ok: true; deltas: BonusDelta[] } | { ok: false; error: ValidationError } {
  const b = (body ?? {}) as { updates?: unknown };
  if (!Array.isArray(b.updates)) {
    return { ok: false, error: err('updates must be an array') };
  }
  const deltas: BonusDelta[] = [];
  for (const raw of b.updates) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: err('each update must be an object') };
    const u = raw as { teamId?: unknown; category?: unknown; delta?: unknown };
    if (typeof u.teamId !== 'string' || u.teamId.length === 0) {
      return { ok: false, error: err('teamId required') };
    }
    if (!isBonusCategory(u.category)) {
      return { ok: false, error: err('category must be one of mario | crokinole | helping') };
    }
    if (typeof u.delta !== 'number' || !Number.isInteger(u.delta)) {
      return { ok: false, error: err('delta must be an integer') };
    }
    deltas.push({ teamId: u.teamId, category: u.category, delta: u.delta });
  }
  return { ok: true, deltas };
}

export function parseActiveBody(
  body: unknown,
): { ok: true; active: boolean } | { ok: false; error: ValidationError } {
  const b = (body ?? {}) as { active?: unknown };
  if (typeof b.active !== 'boolean') {
    return { ok: false, error: err('active must be boolean') };
  }
  return { ok: true, active: b.active };
}

function err(message: string): ValidationError {
  return { status: 400, error: 'invalid_body', message };
}
