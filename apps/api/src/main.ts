import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { ConfigType } from '@nestjs/config';
import { ConsoleLogger, Logger as NestLogger, ServiceUnavailableException, type Type } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { Server } from 'node:http';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger, PinoLogger } from 'nestjs-pino';
import { pino } from 'pino';
import { requestLogging } from './common/logging';
import { AppModule } from './app.module';
import { appConfig, ConfigurationError } from './config/app.config';
import { installShutdownHandlers } from './lifecycle/shutdown';
import { ApplicationState } from './lifecycle/application-state';

export async function createApplication(rootModule: Type = AppModule) {
  let app: NestExpressApplication;
  try {
    app = await NestFactory.create<NestExpressApplication>(rootModule, {
      abortOnError: false,
      logger: false,
      bufferLogs: true,
      autoFlushLogs: false,
      bodyParser: false,
    });
  } catch (error) {
    // A failed provider may have buffered an exception containing credentials.
    // Drain with logging disabled, not into the selected console/Pino logger.
    NestLogger.overrideLogger(false);
    NestLogger.flush();
    throw error;
  }
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  if (config.NODE_ENV === 'development') {
    const levels = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'] as const;
    const threshold = { fatal: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5, silent: -1 } as const;
    app.useLogger(new ConsoleLogger({
      logLevels: levels.slice(0, threshold[config.LOG_LEVEL] + 1),
    }));
  } else {
    app.useLogger(app.get(Logger));
  }
  app.flushLogs();
  app.use(requestLogging((await app.resolve(PinoLogger)).logger));
  app.use(helmet());
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  const state = app.get(ApplicationState);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (!state.isReady && request.path !== '/api/health' && request.path !== '/api/health/ready') {
      response.setHeader('Connection', 'close');
      next(new ServiceUnavailableException());
      return;
    }
    next();
  });
  app.useBodyParser('json', { limit: config.BODY_LIMIT_BYTES });
  app.useBodyParser('urlencoded', { limit: config.BODY_LIMIT_BYTES, extended: false });
  app.setGlobalPrefix('api');
  const server: Server = app.getHttpServer();
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return app;
}

export async function bootstrap(rootModule: Type = AppModule) {
  const app = await createApplication(rootModule);
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  try {
    await app.listen(config.PORT, config.HOST);
    installShutdownHandlers(app);
    return app;
  } catch (error) {
    // Failed startup must not hang indefinitely while disposing partial resources.
    const deadline = setTimeout(() => {
      pino().fatal('API startup cleanup timed out');
      process.exit(1);
    }, config.SHUTDOWN_TIMEOUT_MS);
    try {
      await app.close();
    } finally {
      clearTimeout(deadline);
    }
    throw error;
  }
}

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    // Never serialize the original startup exception: it may contain credentials.
    pino().fatal(error instanceof ConfigurationError ? error.message : 'Failed to start the API.');
    process.exitCode = 1;
  });
}
