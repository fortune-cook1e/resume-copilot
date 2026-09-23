import { STATUS_CODES } from 'node:http';
import { ArgumentsHost, Catch, HttpException, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { HttpErrorResponse } from '@resume-copilot/contracts';
import { RAW_RESPONSE } from '../responses/raw-response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : parserStatus(exception);
    const statusCode = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
    const message = STATUS_CODES[statusCode] ?? 'Request Failed';
    const code = message.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const body: HttpErrorResponse | { statusCode: number; code: string; message: string; requestId: string } =
      Reflect.getMetadata(RAW_RESPONSE, request) === true
        ? { statusCode, code, message, requestId: String(request.id) }
        : { data: null, error: { code, message } };
    if (!response.headersSent) {
      response.setHeader('Cache-Control', 'no-store');
      response.status(statusCode).json(body);
    } else {
      response.end();
    }
  }
}

function parserStatus(error: unknown): number {
  if (!(error instanceof Error) || !('type' in error)) return 500;
  switch (error.type) {
    case 'entity.too.large':
    case 'parameters.too.many': return 413;
    case 'entity.parse.failed':
    case 'request.aborted':
    case 'request.size.invalid': return 400;
    case 'charset.unsupported':
    case 'encoding.unsupported': return 415;
    default: return 500;
  }
}
