import http from 'k6/http';
import { check, sleep } from 'k6';
import { leaderboardUrl } from '../lib/common.js';

// 300 clients polling /api/leaderboard every 30s (matches client POLL_MS).
// Verifies snapshot cache absorbs hits — IL call rate must stay near 6/min.

export const options = {
  scenarios: {
    polling: {
      executor: 'constant-vus',
      vus: 300,
      duration: '10m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<100'], // cached hits should be fast
  },
};

export default function () {
  const res = http.get(leaderboardUrl(), { tags: { name: 'leaderboard' } });
  check(res, {
    'status 200': (r) => r.status === 200,
    'has teams': (r) => {
      try {
        const j = r.json();
        return Array.isArray(j.teams);
      } catch {
        return false;
      }
    },
  });
  sleep(30);
}
