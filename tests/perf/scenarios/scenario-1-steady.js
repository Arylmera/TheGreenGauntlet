import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { streamUrl } from '../lib/common.js';

// Steady-state SSE fan-out: ramp 100 → 300 clients, hold 15 min.
// Each VU opens ONE SSE connection and holds it for the test lifetime.
// k6 has no native SSE understanding — for true per-event metrics build
// k6 with xk6-sse. This script measures connection-level health
// (accept rate, time-to-first-byte) and asserts the initial payload.

export const options = {
  scenarios: {
    sse_steady: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 300 },
        { duration: '15m', target: 300 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '10s',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    sse_first_byte: ['p(95)<500'],
    sse_initial_payload_ok: ['rate>0.99'],
    // http_req_failed is intentionally NOT thresholded: long-held SSE
    // connections get aborted at test-end and counted as "failed" by k6.
  },
};

const firstByte = new Trend('sse_first_byte', true);
const initialOk = new Rate('sse_initial_payload_ok');

export default function () {
  // One iteration per VU, held for the entire scenario.
  // Timeout is intentionally longer than the test duration so the
  // connection isn't closed by k6's per-request timer.
  const res = http.get(streamUrl(), {
    timeout: '25m',
    headers: { Accept: 'text/event-stream' },
    tags: { name: 'sse-stream' },
  });
  firstByte.add(res.timings.waiting);
  const ok =
    res.status === 200 &&
    typeof res.body === 'string' &&
    res.body.includes('leaderboard-updated');
  initialOk.add(ok ? 1 : 0);
  check(res, { 'sse 200 + initial payload': () => ok });
}
