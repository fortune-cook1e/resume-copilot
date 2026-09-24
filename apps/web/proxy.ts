import { NextRequest, NextResponse } from 'next/server';
import { error } from '@/lib/api-response';

const inPath = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // NestJS checks its own /api/auth writes; Web business writes require a trusted Origin by default.
  if (inPath(pathname, '/api') && !inPath(pathname, '/api/auth') &&
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const publicOrigin = new URL(
      process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    ).origin;
    if (request.headers.get('origin') !== publicOrigin) return error('Forbidden', 403);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
