import { loadEnv } from './env.js';
import { createLogger } from './logger.js';
import { ensureWritableDir } from './snapshotStore.js';
import { ImmersiveLabClient } from './immersiveLab.js';
import { StubAccountSource } from './stubClient.js';
import { LeaderboardAggregator, type AccountSource } from './aggregate.js';
import { buildApp } from './app.js';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

async function main(): Promise<void> {
  await ensureWritableDir(env.DATA_DIR);

  logger.info(
    {
      dataDir: env.DATA_DIR,
      eventWindow: { startAt: env.EVENT_START_AT, endAt: env.EVENT_END_AT },
      stubUpstream: env.USE_STUB_UPSTREAM,
      hasAccessKey: Boolean(env.IMMERSIVELAB_ACCESS_KEY),
      hasSecret: Boolean(env.IMMERSIVELAB_SECRET_TOKEN),
    },
    'boot config',
  );

  let client: AccountSource;
  if (env.USE_STUB_UPSTREAM) {
    logger.warn('USE_STUB_UPSTREAM=true — serving synthetic data, not ImmersiveLab');
    client = new StubAccountSource();
  } else {
    const real = new ImmersiveLabClient({ env });
    await real.init();
    client = real;
  }

  const aggregator = new LeaderboardAggregator({ env, client });
  await aggregator.init();

  const app = await buildApp({ env, client, aggregator, serveStatic: true });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  logger.error({ err }, 'fatal boot failure');
  process.exit(1);
});
