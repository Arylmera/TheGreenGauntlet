import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';
import { streamUrl } from '../lib/common.js';

const initialOk = new Rate('sse_initial_payload_ok');

// 8-hour soak at 100 SSE clients. Watch external metrics (memory,
// FD count, SQLite size, token refresh logs) on the server side; this
// script just keeps connections open and reports basic counters.

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '8h',
    },
  },
  thresholds: {
    sse_initial_payload_ok: ['rate>0.99'],
    // Long-lived SSE requests are aborted at test end; not thresholded.
  },
};

export default function () {
  const res = http.get(streamUrl(), {
    timeout: '9h',
    headers: { Accept: 'text/event-stream' },
    tags: { name: 'sse-soak' },
  });
  const ok =
    res.status === 200 &&
    typeof res.body === 'string' &&
    res.body.includes('leaderboard-updated');
  initialOk.add(ok ? 1 : 0);
  check(res, { 'sse 200 + initial payload': () => ok });
}
