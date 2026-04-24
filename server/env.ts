import 'dotenv/config';
import { z } from 'zod';

const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
  message: 'must be ISO 8601',
});

const schema = z
  .object({
    IMMERSIVELAB_ACCESS_KEY: z.string().default(''),
    IMMERSIVELAB_SECRET_TOKEN: z.string().default(''),
    IMMERSIVELAB_BASE_URL: z.string().url().default('https://api.immersivelabs.online'),
    EVENT_START_AT: iso,
    EVENT_END_AT: iso,
    PORT: z.coerce.number().int().positive().default(3000),
    SNAPSHOT_TTL_MS: z.coerce.number().int().positive().default(10_000),
    TOKEN_REFRESH_MARGIN_S: z.coerce.number().int().nonnegative().default(60),
    DATA_DIR: z.string().min(1).default('/app/data'),
    LOG_LEVEL: z.string().default('info'),
    NODE_ENV: z.string().default('production'),
    USE_STUB_UPSTREAM: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD is required'),
    ADMIN_SESSION_SECRET: z
      .string()
      .min(32, 'ADMIN_SESSION_SECRET must be at least 32 characters'),
    ADMIN_SESSION_TTL_MS: z.coerce.number().int().positive().default(172_800_000),
    BONUS_DB_PATH: z.string().optional(),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
  })
  .refine((e) => Date.parse(e.EVENT_START_AT) < Date.parse(e.EVENT_END_AT), {
    message: 'EVENT_START_AT must be before EVENT_END_AT',
    path: ['EVENT_START_AT'],
  })
  .refine((e) => e.USE_STUB_UPSTREAM || (e.IMMERSIVELAB_ACCESS_KEY && e.IMMERSIVELAB_SECRET_TOKEN), {
    message: 'credentials required unless USE_STUB_UPSTREAM=true',
    path: ['IMMERSIVELAB_ACCESS_KEY'],
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }
  return parsed.data;
}

