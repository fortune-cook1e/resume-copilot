import path from 'node:path';
import type { NextConfig } from 'next';

const apiOrigin = new URL(process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001').origin;

const nextConfig: NextConfig = {
  async rewrites() {
    return { beforeFiles: [
      { source: '/api/auth/:path*', destination: `${apiOrigin}/api/auth/:path*` },
      { source: '/api/me', destination: `${apiOrigin}/api/me` },
      { source: '/api/resumes', destination: `${apiOrigin}/api/resumes` },
      { source: '/api/resumes/:path*', destination: `${apiOrigin}/api/resumes/:path*` },
      { source: '/api/mcp', destination: `${apiOrigin}/api/mcp` },
      { source: '/.well-known/:path*', destination: `${apiOrigin}/.well-known/:path*` },
    ] };
  },
  // Enable standalone output for Docker deployment
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  // outputFileTracingIncludes: {
  //   'app/api/export-pdf/route': [
  //     './node_modules/@sparticuz/chromium/bin/**',
  //     './node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**',
  //   ],
  // },
};

export default nextConfig;
