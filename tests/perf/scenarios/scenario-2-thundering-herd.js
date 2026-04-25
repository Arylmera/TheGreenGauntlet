import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { streamUrl } from '../lib/common.js';

// Thundering herd: ~300 SSE clients connect within 5s.
// Verifies rebuild dedup — server log should show 1 IL rebuild, not 300.
// Each VU holds one connection until the test ends.

export const options = {
  scenarios: {
    burst: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 300,
      maxVUs: 400,
      stages: [
        { duration: '5s', target: 60 }, // ~300 connects in 5s
        { duration: '5s', target: 0 },
        { duration: '2m', target: 0 },  // hold so connections persist
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: {
    sse_first_payload: ['p(95)<500'],
    sse_initial_payload_ok: ['rate>0.99'],
  },
};

const firstPayload = new Trend('sse_first_payload', true);
const initialOk = new Rate('sse_initial_payload_ok');

export default function () {
  const res = http.get(streamUrl(), {
    timeout: '5m',
    headers: { Accept: 'text/event-stream' },
    tags: { name: 'sse-burst' },
  });
  firstPayload.add(res.timings.waiting);
  const ok =
    res.status === 200 &&
    typeof res.body === 'string' &&
    res.body.includes('leaderboard-updated');
  initialOk.add(ok ? 1 : 0);
  check(res, { 'sse 200 + initial payload': () => ok });
}
