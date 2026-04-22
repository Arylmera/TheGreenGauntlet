import pino, { type Logger } from 'pino';

export function createLogger(level: string): Logger {
  return pino({
    level,
    base: { service: 'green-gauntlet' },
    redact: {
      paths: ['req.headers.authorization', 'password', 'secret', 'token'],
      censor: '[redacted]',
    },
  });
}
