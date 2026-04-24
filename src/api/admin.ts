import type { AdminBonusListResponse, BonusBatchUpdate } from '../types';

async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = `request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      if (body.message) message = body.message;
      else if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function adminLogin(password: string): Promise<void> {
  await jsonRequest<{ ok: true }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function adminLogout(): Promise<void> {
  await jsonRequest<{ ok: true }>('/api/admin/logout', { method: 'POST' });
}

export async function listBonus(): Promise<AdminBonusListResponse> {
  return jsonRequest<AdminBonusListResponse>('/api/admin/bonus', { method: 'GET' });
}

export async function applyBonusBatch(updates: BonusBatchUpdate[]): Promise<void> {
  await jsonRequest<{ ok: true }>('/api/admin/bonus/batch', {
    method: 'POST',
    body: JSON.stringify({ updates }),
  });
}

export async function setTeamActive(teamId: string, active: boolean): Promise<void> {
  await jsonRequest<{ ok: true }>(`/api/admin/bonus/${encodeURIComponent(teamId)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}
