import { resolve } from 'node:path';
import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { createLogger } from './common/logging';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/responses/response.interceptor';
import { appConfig } from './config/app.config';
import { AppController } from './app.controller';
import { ApplicationState } from './lifecycle/application-state';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../.env'),
      ignoreEnvFile: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test',
      load: [appConfig],
    }),
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
    ApplicationState,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
  controllers: [AppController],
})
export class AppModule {}
