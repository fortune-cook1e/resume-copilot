import { Injectable, StreamableFile, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';
import { RAW_RESPONSE } from './raw-response';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    if (this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE, [context.getHandler(), context.getClass()])) {
      Reflect.defineMetadata(RAW_RESPONSE, true, request);
      return next.handle();
    }
    return next.handle().pipe(map(data => {
      // These responses have their own HTTP framing; they are not business JSON.
      if (request.method === 'HEAD' || response.statusCode === 204 || response.statusCode === 304 || response.headersSent || data instanceof StreamableFile) {
        return data;
      }
      return { data: data ?? null, error: null };
    }));
  }
}
