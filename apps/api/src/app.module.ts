import { Module, RequestMethod, type DynamicModule } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'
import { createLogger } from './common/logging'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/responses/response.interceptor'
import { appConfig } from './config/app.config'
import { HealthModule } from './health/health.module'
import { RuntimeModule, type WorkerBindings } from './config/runtime.module'
import { AuthModule } from './auth/auth.module'
import { ResumesModule } from './resumes/resumes.module'

@Module({
  imports: [
    AuthModule,
    ResumesModule,
    HealthModule,
    LoggerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        pinoHttp: { logger: createLogger(config) },
        // Bootstrap installs pino-http before body parsing, including parse failures.
        useExisting: true,
        forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
      }),
    }),
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {
  static register(bindings: WorkerBindings): DynamicModule {
    return { module: AppModule, imports: [RuntimeModule.register(bindings)] }
  }
}
