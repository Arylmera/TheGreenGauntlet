import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Env } from '../../env.js';
import {
  COOKIE_NAME,
  buildClearCookie,
  buildSessionCookie,
  parseCookies,
  signSession,
  timingSafeEqualStrings,
  verifySession,
} from '../../adminSession.js';

type LoginLimiter = {
  check: (now: number) => boolean;
  record: (now: number) => void;
};

function createLimiter(maxAttempts: number, windowMs: number): LoginLimiter {
  const attempts: number[] = [];
  return {
    check(now: number) {
      while (attempts.length > 0 && now - (attempts[0] as number) > windowMs) {
        attempts.shift();
      }
      return attempts.length < maxAttempts;
    },
    record(now: number) {
      attempts.push(now);
    },
  };
}

export function requireAdmin(env: Env) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const cookies = parseCookies(req.headers['cookie']);
    const token = cookies[COOKIE_NAME];
    const payload = verifySession(token, env.ADMIN_SESSION_SECRET);
    if (!payload) {
      await reply.code(401).send({ error: 'unauthorized' });
    }
  };
}

export function registerAdminAuthRoutes(app: FastifyInstance, env: Env): void {
  const limiter = createLimiter(20, 5 * 60_000);
  const secure = env.NODE_ENV === 'production';

  app.post('/api/admin/login', async (req, reply) => {
    const now = Date.now();
    if (!limiter.check(now)) {
      app.log.warn({ ip: req.ip }, 'admin login rate-limited');
      return reply.code(429).send({ error: 'rate_limited' });
    }

    const body = (req.body ?? {}) as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';
    const ok = timingSafeEqualStrings(password, env.ADMIN_PASSWORD);
    if (!ok) {
      limiter.record(now);
      app.log.warn({ ip: req.ip }, 'admin login failed');
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    const exp = now + env.ADMIN_SESSION_TTL_MS;
    const token = signSession({ sub: 'admin', exp }, env.ADMIN_SESSION_SECRET);
    reply.header('set-cookie', buildSessionCookie(token, env.ADMIN_SESSION_TTL_MS, secure));
    return { ok: true };
  });

  app.post('/api/admin/logout', async (_req, reply) => {
    reply.header('set-cookie', buildClearCookie(secure));
    return { ok: true };
  });
}
