import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // outputFileTracingIncludes: {
  //   'app/api/export-pdf/route': [
  //     './node_modules/@sparticuz/chromium/bin/**',
  //     './node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**',
  //   ],
  // },
};

export default nextConfig;
