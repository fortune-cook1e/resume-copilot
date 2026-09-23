import { isIP } from 'node:net';
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const integer = (min: number, max: number, fallback: string) =>
  z.string().regex(/^\d+$/).default(fallback).transform(Number).pipe(z.number().int().min(min).max(max));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().refine(value => value === 'localhost' || isIP(value) !== 0).default('0.0.0.0'),
  PORT: integer(1, 65535, '3001'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SHUTDOWN_TIMEOUT_MS: integer(100, 120000, '10000'),
  BODY_LIMIT_BYTES: integer(1, 10485760, '1048576'),
});

export class ConfigurationError extends Error {
  constructor(keys: string[]) {
    super(`Invalid configuration: ${keys.join(', ')}`);
  }
}

export const appConfig = registerAs('app', () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new ConfigurationError([...new Set(result.error.issues.map(issue => String(issue.path[0])))]);
  }
  return result.data;
});
