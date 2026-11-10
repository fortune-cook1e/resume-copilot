import { registerAs } from '@nestjs/config'
import { z } from 'zod'

const integer = (min: number, max: number, fallback: string) =>
  z
    .string()
    .regex(/^\d+$/)
    .default(fallback)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max))

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    BODY_LIMIT_BYTES: integer(1, 10485760, '1048576'),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    MCP_CLIENT_ID: z.string().min(1).optional(),
    MCP_CLIENT_SECRET: z.string().min(32).optional(),
    MCP_REDIRECT_URI: z
      .url()
      .refine((value) => {
        if (!URL.canParse(value)) return false
        const url = new URL(value)
        return url.protocol === 'https:' && !url.username && !url.password && !url.hash
      })
      .optional(),
    BETTER_AUTH_URL: z
      .url()
      .refine((value) => new URL(value).origin === value.replace(/\/$/, ''))
      .transform((value) => new URL(value).origin),
  })
  .superRefine((env, context) => {
    if (env.MCP_CLIENT_ID || env.MCP_CLIENT_SECRET || env.MCP_REDIRECT_URI) {
      for (const key of ['MCP_CLIENT_ID', 'MCP_CLIENT_SECRET', 'MCP_REDIRECT_URI'] as const) {
        if (!env[key])
          context.addIssue({ code: 'custom', path: [key], message: 'Required for MCP' })
      }
    }
    if (
      env.NODE_ENV === 'production' &&
      (!URL.canParse(env.BETTER_AUTH_URL) || new URL(env.BETTER_AUTH_URL).protocol !== 'https:')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['BETTER_AUTH_URL'],
        message: 'HTTPS is required in production',
      })
    }
  })

export class ConfigurationError extends Error {
  constructor(keys: string[]) {
    super(`Invalid configuration: ${keys.join(', ')}`)
  }
}

export function parseAppConfig(input: unknown) {
  const result = envSchema.safeParse(input)
  if (!result.success) {
    throw new ConfigurationError([
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ])
  }
  return result.data
}

export const appConfig = registerAs('app', () => parseAppConfig(process.env))
