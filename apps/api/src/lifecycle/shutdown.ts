import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ApplicationState } from './application-state';
import { appConfig } from '../config/app.config';

// Own signals here instead of Nest's default handler: drain HTTP before destroying
// providers so in-flight work cannot lose its database/resources during shutdown.
export function installShutdownHandlers(app: INestApplication): void {
  const state = app.get(ApplicationState);
  const logger = app.get(Logger);
  const server: Server = app.getHttpServer();
  let closing = false;
  // Node closes idle sockets at server.close(), but a request can become idle
  // later. Reap those keep-alive sockets after its response has finished.
  server.on('request', (_request, response) => {
    response.once('finish', () => {
      if (closing) setImmediate(() => server.closeIdleConnections());
    });
  });

  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    state.beginShutdown();
    // Keep this timer referenced: a hung hook with no active handles must not
    // accidentally look like a successful exit. It also bounds log flushing.
    setTimeout(() => {
      logger.error('API shutdown timed out');
      process.exit(1);
    }, app.get(appConfig.KEY).SHUTDOWN_TIMEOUT_MS);
    logger.log({ signal, msg: 'API shutdown started' });
    try {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
      });
      await app.close();
      logger.log('API shutdown completed');
      process.stdout.write('', () => process.exit(0));
    } catch {
      logger.error('API shutdown failed');
      process.stdout.write('', () => process.exit(1));
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}
