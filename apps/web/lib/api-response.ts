import { STATUS_CODES } from 'node:http';
import { NextResponse } from 'next/server';
import type { HttpErrorResponse, HttpSuccessResponse } from '@resume-copilot/contracts';

/** Legacy Web business routes share the API's public envelope, not Better Auth's native protocol. */
export function success<T>(data: T, status = 200): NextResponse<HttpSuccessResponse<T>> {
  return NextResponse.json({ data, error: null }, { status });
}

export function error(message: string, status = 400): NextResponse<HttpErrorResponse> {
  const code = (STATUS_CODES[status] ?? 'Request Failed').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return NextResponse.json({ data: null, error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}
