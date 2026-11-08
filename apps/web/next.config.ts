import path from 'node:path'
import type { NextConfig } from 'next'

const apiOrigin = new URL(process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001').origin

const nextConfig: NextConfig = {
  agentRules: false,
  async rewrites() {
    // next dev uses HTTP locally; production routes /api through the Worker binding.
    if (process.env.NODE_ENV !== 'development') return []
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }]
  },
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
}

export default nextConfig
