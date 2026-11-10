import { Global, Module, type DynamicModule } from '@nestjs/common'
import type { D1Database } from '@cloudflare/workers-types'
import { appConfig, parseAppConfig } from './app.config'

export interface WorkerBindings {
  DB: D1Database
  BETTER_AUTH_URL: string
  BETTER_AUTH_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  MCP_CLIENT_ID?: string
  MCP_CLIENT_SECRET?: string
  MCP_REDIRECT_URI?: string
  NODE_ENV?: string
  LOG_LEVEL?: string
  BODY_LIMIT_BYTES?: string
}
export const D1_BINDING = 'D1_BINDING'

@Global()
@Module({})
export class RuntimeModule {
  static register(bindings: WorkerBindings): DynamicModule {
    return {
      module: RuntimeModule,
      providers: [
        { provide: appConfig.KEY, useValue: parseAppConfig(bindings) },
        { provide: D1_BINDING, useValue: bindings.DB },
      ],
      exports: [appConfig.KEY, D1_BINDING],
    }
  }
}
