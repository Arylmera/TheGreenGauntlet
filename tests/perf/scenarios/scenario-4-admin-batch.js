import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { ADMIN_PASSWORD, adminUrl, streamUrl } from '../lib/common.js';

// 100 SSE viewers + 1 admin pushing bonus batches every 30s for 10 min.
// Measures SQLite write latency under viewer load.

export const options = {
  scenarios: {
    viewers: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
      exec: 'viewer',
    },
    admin: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10m',
      exec: 'admin',
      startTime: '5s',
    },
  },
  thresholds: {
    'http_req_duration{name:admin-batch}': ['p(95)<1000'],
    'http_req_failed{name:admin-login}': ['rate<0.01'],
    'http_req_failed{name:admin-batch}': ['rate<0.01'],
    // SSE viewer requests are long-lived and aborted at test end —
    // they get counted as failed by k6, so we don't threshold on them.
  },
};

const batchLatency = new Trend('admin_batch_ms', true);

export function viewer() {
  http.get(streamUrl(), {
    timeout: '11m',
    headers: { Accept: 'text/event-stream' },
    tags: { name: 'sse-viewer' },
  });
}

export function admin() {
  const login = http.post(
    adminUrl('/login'),
    JSON.stringify({ password: ADMIN_PASSWORD }),
    { headers: { 'content-type': 'application/json' }, tags: { name: 'admin-login' } },
  );
  check(login, { 'login 200': (r) => r.status === 200 });

  const cookie = login.cookies?.session?.[0]?.value;
  if (!cookie) return;
  const headers = {
    'content-type': 'application/json',
    cookie: `session=${cookie}`,
  };

  while (true) {
    const body = JSON.stringify({
      deltas: [
        { teamId: 'mock-1', category: 'mario', amount: 1 },
        { teamId: 'mock-2', category: 'crokinole', amount: 1 },
        { teamId: 'mock-3', category: 'helping', amount: 1 },
      ],
    });
    const res = http.post(adminUrl('/bonus/batch'), body, {
      headers,
      tags: { name: 'admin-batch' },
    });
    batchLatency.add(res.timings.duration);
    check(res, { 'batch ok': (r) => r.status === 200 });
    sleep(30);
  }
}
