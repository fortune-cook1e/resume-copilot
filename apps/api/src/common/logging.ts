import { randomUUID } from 'node:crypto';
import type { ConfigType } from '@nestjs/config';
import type { Request, Response, RequestHandler } from 'express';
import { pino, type LoggerOptions } from 'pino';
import { pinoHttp } from 'pino-http';
import type { appConfig } from '../config/app.config';

// Whitelist request metadata. Never serialize raw headers, URLs, bodies or errors.
const safeSerializers: LoggerOptions['serializers'] = {
  req: () => undefined,
  res: () => undefined,
  err: () => ({ type: 'InternalError' }),
};

export function createLogger(config: ConfigType<typeof appConfig>) {
  return pino({ level: config.LOG_LEVEL, serializers: safeSerializers }, process.stdout);
}

export function requestLogging(logger: ReturnType<typeof createLogger>): RequestHandler {
  return pinoHttp<Request, Response>({
    logger,
    wrapSerializers: false,
    serializers: safeSerializers,
    quietReqLogger: true,
    quietResLogger: true,
    customAttributeKeys: { reqId: 'requestId' },
    genReqId: (_request, response) => {
      const id = randomUUID();
      response.setHeader('X-Request-ID', id);
      return id;
    },
    customLogLevel: (_request, response, error) => {
      if (error || response.statusCode >= 500) return 'error';
      return response.statusCode >= 400 ? 'warn' : 'info';
    },
    customSuccessObject: (request, response, value) => completion(request, response, value.responseTime),
    customErrorObject: (request, response, _error, value) => completion(request, response, value.responseTime),
    customSuccessMessage: () => 'request completed',
    customErrorMessage: () => 'request failed',
  });
}

function completion(request: Request, response: Response, duration: unknown) {
  // Express route.path comes from application route registration, not the incoming URL.
  const route: unknown = request.route?.path;
  return {
    method: request.method,
    route: typeof route === 'string' ? route : '<unmatched>',
    statusCode: response.statusCode,
    responseTime: duration,
  };
}
