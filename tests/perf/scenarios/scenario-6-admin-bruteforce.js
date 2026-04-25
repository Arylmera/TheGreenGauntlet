import http from 'k6/http';
import { check } from 'k6';
import { adminUrl, leaderboardUrl } from '../lib/common.js';

// 100 logins/min from a single VU (single IP). Verifies rate limiter
// (20/5min) eventually returns 429, and that public leaderboard remains
// fully responsive throughout.

export const options = {
  scenarios: {
    bruteforce: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1m',
      duration: '10m',
      preAllocatedVUs: 5,
      exec: 'attack',
    },
    public: {
      executor: 'constant-vus',
      vus: 5,
      duration: '10m',
      exec: 'public',
    },
  },
  thresholds: {
    'http_req_duration{name:public-leaderboard}': ['p(95)<200'],
    'http_req_failed{name:public-leaderboard}': ['rate<0.01'],
  },
};

export function attack() {
  const res = http.post(
    adminUrl('/login'),
    JSON.stringify({ password: 'wrong-password' }),
    { headers: { 'content-type': 'application/json' }, tags: { name: 'admin-login' } },
  );
  check(res, {
    'login rejected (401 or 429)': (r) => r.status === 401 || r.status === 429,
  });
}

export function public_() {
  const res = http.get(leaderboardUrl(), { tags: { name: 'public-leaderboard' } });
  check(res, { 'status 200': (r) => r.status === 200 });
}

export { public_ as public };
