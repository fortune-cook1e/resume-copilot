import type { RequestHandler } from 'express'

export function originProtection(publicOrigin: string, mcpEnabled = false): RequestHandler {
  return (request, response, next) => {
    // The OAuth token endpoint authenticates the client and does not use browser cookies.
    if (
      mcpEnabled &&
      request.method === 'POST' &&
      request.path === '/auth/oauth2/token' &&
      request.headers.origin === undefined &&
      request.headers.cookie === undefined
    )
      return next()
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.headers.origin !== publicOrigin
    ) {
      response.setHeader('Cache-Control', 'no-store')
      response.status(403).end()
      return
    }
    next()
  }
}
