import { NextResponse } from 'next/server';

/**
 * Unified API response format:
 * { code: 0 | 1, msg: string, data: T | null }
 *
 * code 0 = success, code 1 = error
 *
 * NOTE: This is only for application API routes (e.g. /api/resumes).
 * Do NOT use for better-auth routes (/api/auth/*) — they have their own format.
 */

export enum ResponseCode {
  SUCCESS = 0,
  ERROR = 1,
}

export interface ApiResponse<T = unknown> {
  code: ResponseCode;
  msg: string;
  data: T | null;
}

/** Return a success response */
export function success<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ code: ResponseCode.SUCCESS, msg: 'success', data }, { status });
}

/** Return an error response */
export function error(msg: string, status = 400): NextResponse<ApiResponse<null>> {
  return NextResponse.json({ code: ResponseCode.ERROR, msg, data: null }, { status });
}
