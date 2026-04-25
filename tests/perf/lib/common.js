export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'perftest';

export function leaderboardUrl() {
  return `${BASE_URL}/api/leaderboard`;
}

export function streamUrl() {
  return `${BASE_URL}/api/leaderboard/stream`;
}

export function adminUrl(path) {
  return `${BASE_URL}/api/admin${path}`;
}
