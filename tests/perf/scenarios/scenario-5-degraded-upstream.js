import http from 'k6/http';
import { check, sleep } from 'k6';
import { leaderboardUrl } from '../lib/common.js';

// Degraded IL: requires mock-il running with MOCK_IL_LATENCY_MS=5000
// MOCK_IL_ERROR_RATE=0.2. Verifies stale-snapshot fallback and that the
// app does not crash or tight-loop. Mostly we watch the server logs and
// expect 200s from /api/leaderboard backed by the cached snapshot.

export const options = {
  scenarios: {
    degraded: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
  },
  thresholds: {
    'http_req_failed{name:leaderboard}': ['rate<0.20'],
  },
};

export default function () {
  const res = http.get(leaderboardUrl(), { tags: { name: 'leaderboard' } });
  check(res, {
    'status 200 or 503': (r) => r.status === 200 || r.status === 503,
    'no 5xx other than 503': (r) => r.status < 500 || r.status === 503,
  });
  sleep(2);
}
