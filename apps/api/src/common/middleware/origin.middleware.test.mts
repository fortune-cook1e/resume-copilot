import { once } from 'node:events'
import type { Server } from 'node:http'
import { createRequire } from 'node:module'
import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Exercise the compiled middleware through HTTP without constructing database providers.
const require = createRequire(import.meta.url)
const { originProtection } =
  require('../../../dist/common/middleware/origin.middleware.js') as typeof import('../../../dist/common/middleware/origin.middleware.js')
const publicOrigin = 'http://localhost:3000'

describe('API request origin protection', () => {
  let server: Server
  let baseURL: string

  beforeAll(async () => {
    const app = express()
    app.use('/api', originProtection(publicOrigin))
    app.use(express.json())
    app.use((_request, response) => response.status(200).json({ accepted: true }))
    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No test port allocated')
    baseURL = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    }
  })

  it('allows a write from the configured public origin on a newly added API route', async () => {
    const response = await fetch(`${baseURL}/api/new-feature`, {
      method: 'POST',
      headers: { origin: publicOrigin },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ accepted: true })
  })

  it.each([
    ['POST', undefined],
    ['POST', 'https://untrusted.invalid'],
    ['POST', 'null'],
    ['DELETE', 'https://untrusted.invalid'],
  ] as const)('rejects %s with missing or untrusted Origin (%j)', async (method, origin) => {
    const response = await fetch(`${baseURL}/api/new-feature`, {
      method,
      headers: origin === undefined ? {} : { origin },
    })
    expect(response.status).toBe(403)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toBe('')
  })

  it.each(['GET', 'HEAD', 'OPTIONS'])(
    'allows %s without Origin, including the OAuth callback path',
    async (method) => {
      const response = await fetch(`${baseURL}/api/auth/callback/google?state=test-state`, {
        method,
      })
      expect(response.status).toBe(200)
    },
  )
})
