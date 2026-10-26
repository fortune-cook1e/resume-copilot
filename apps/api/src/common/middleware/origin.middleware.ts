import type { RequestHandler } from 'express'

export function originProtection(publicOrigin: string): RequestHandler {
  return (request, response, next) => {
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
