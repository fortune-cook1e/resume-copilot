import { createMcpProtectedRequestHandler } from '@better-auth/mcp'
import { ConnectionsService, InactiveConnectionError } from '../oauth/connections.service'

type Options = Parameters<typeof createMcpProtectedRequestHandler>[0]
type Handler = Parameters<typeof createMcpProtectedRequestHandler>[1]

export function createConnectionProtectedHandler(
  options: Options,
  connections: ConnectionsService,
  handler: Handler,
) {
  return createMcpProtectedRequestHandler(options, async (request, claims) => {
    try {
      await connections.authorizeAccess(claims)
    } catch (error) {
      const inactive = error instanceof InactiveConnectionError
      const metadata = new URL(options.audience)
      metadata.pathname = `/.well-known/oauth-protected-resource${metadata.pathname}`
      return Response.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32000,
            message: inactive ? 'Invalid access token' : 'Authorization unavailable',
          },
        },
        {
          status: inactive ? 401 : 503,
          headers: {
            'cache-control': 'no-store',
            ...(inactive
              ? {
                  'www-authenticate': `Bearer error="invalid_token", resource_metadata="${metadata.href}"`,
                }
              : {}),
          },
        },
      )
    }
    return handler(request, claims)
  })
}
