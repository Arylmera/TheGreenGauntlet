import Fastify from 'fastify';

const PORT = Number(process.env.MOCK_IL_PORT ?? 4100);
const LATENCY_MS = Number(process.env.MOCK_IL_LATENCY_MS ?? 0);
const ERROR_RATE = Number(process.env.MOCK_IL_ERROR_RATE ?? 0);
const TOKEN_TTL_S = Number(process.env.MOCK_IL_TOKEN_TTL_S ?? 3600);
const TEAM_COUNT = Number(process.env.MOCK_IL_TEAM_COUNT ?? 30);
const PAGE_SIZE = Number(process.env.MOCK_IL_PAGE_SIZE ?? 50);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function teams() {
  const out = [];
  for (let i = 0; i < TEAM_COUNT; i++) {
    out.push({
      uuid: `mock-${i + 1}`,
      email: `team-${i + 1}@immersivelabs.pro`,
      externalId: `ext-${i + 1}`,
      points: 100 + i * 10,
    });
  }
  return out;
}

const ALL = teams();

const app = Fastify({ logger: { level: process.env.MOCK_IL_LOG_LEVEL ?? 'warn' } });

app.addHook('onRequest', async (req, reply) => {
  if (LATENCY_MS > 0) await sleep(LATENCY_MS);
  if (ERROR_RATE > 0 && Math.random() < ERROR_RATE) {
    reply.code(503).send({ error: 'simulated_upstream_error' });
  }
});

app.post('/v1/public/tokens', async () => ({
  accessToken: `mock-token-${Date.now()}`,
  expiresIn: TOKEN_TTL_S,
}));

app.get('/v2/accounts', async (req) => {
  const token = String(req.query?.page_token ?? '0');
  const start = Math.max(0, parseInt(token, 10) || 0);
  const end = Math.min(ALL.length, start + PAGE_SIZE);
  const next = end < ALL.length ? String(end) : null;
  return {
    page: ALL.slice(start, end),
    meta: {
      hasNextPage: next !== null,
      hasPreviousPage: start > 0,
      nextPageToken: next,
      previousPageToken: start > 0 ? String(Math.max(0, start - PAGE_SIZE)) : null,
    },
  };
});

app.get('/v2/accounts/:uuid', async (req) => {
  const { uuid } = req.params;
  const idx = ALL.findIndex((a) => a.uuid === uuid);
  if (idx < 0) return { uuid, displayName: null, email: null, points: null };
  const base = ALL[idx];
  return {
    uuid: base.uuid,
    displayName: `Mock Team ${idx + 1}`,
    email: base.email,
    externalId: base.externalId,
    firstName: 'Mock',
    lastName: `Team${idx + 1}`,
    lastActivityAt: new Date().toISOString(),
    points: base.points,
    status: 'ACTIVE',
    timeZone: 'UTC',
  };
});

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(
    `[mock-il] listening on :${PORT} latency=${LATENCY_MS}ms error_rate=${ERROR_RATE} teams=${TEAM_COUNT}`,
  );
});
