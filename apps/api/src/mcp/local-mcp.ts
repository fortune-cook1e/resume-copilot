import type { Request, Response } from 'express'
import {
  localhostHostValidation,
  localhostOriginValidation,
  NodeStreamableHTTPServerTransport,
} from '@modelcontextprotocol/node'
import { McpServer } from '@modelcontextprotocol/server'
import { createConnectionProtectedHandler } from '../auth/mcp-protected-handler'
import { ConnectionsService } from '../oauth/connections.service'

const validateHost = localhostHostValidation()
const validateOrigin = localhostOriginValidation()

export function localMcpHandler(publicOrigin: string, connections: ConnectionsService) {
  const resource = new URL('/api/mcp', publicOrigin).href
  return async (req: Request, res: Response) => {
    if (!validateHost(req, res) || !validateOrigin(req, res)) return
    const protectedRequest = createConnectionProtectedHandler(
      {
        issuer: new URL('/api/auth', publicOrigin).href,
        audience: resource,
        requiredScopes: ['connection:read'],
        jwksUrl: `http://127.0.0.1:${req.socket.localPort}/api/auth/jwks`,
      },
      connections,
      async (_request, claims) => {
        const server = new McpServer(
          { name: 'resume-copilot', version: '0.1.0' },
          {
            instructions:
              'Only get_connection_status is available. It returns minimal account identity and granted permissions; no resume or experience data is exposed.',
          },
        )
        server.registerTool(
          'get_connection_status',
          {
            description: 'Show the connected platform account and granted permissions.',
            annotations: { readOnlyHint: true },
          },
          async () => {
            const { accountId, displayName, grantedScopes } = await connections.status(claims)
            const result = { accountId, displayName, grantedScopes }
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(result) }],
              structuredContent: result,
            }
          },
        )
        const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
        await server.connect(transport)
        try {
          await transport.handleRequest(req, res)
        } finally {
          await server.close()
        }
        // The SDK already owns the native response; this sentinel is never sent.
        return new globalThis.Response(null, { status: 204 })
      },
    )
    try {
      // The verifier needs the method and headers, not a second read of the MCP body.
      const headers = new Headers()
      for (const [name, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(name, value)
        else if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry))
      }
      const verification = new globalThis.Request(resource, { method: req.method, headers })
      const result = await protectedRequest(verification)
      if (res.headersSent || res.writableEnded) return
      res.status(result.status)
      result.headers.forEach((value, key) => res.setHeader(key, value))
      res.end(await result.text())
    } catch {
      if (!res.headersSent) res.status(503).end()
      else res.end()
    }
  }
}
