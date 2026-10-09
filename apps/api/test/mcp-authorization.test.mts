import { createHash, createHmac, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { createServer, type Server } from 'node:http'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import postgres from 'postgres'

const require = createRequire(import.meta.url)
const { drizzle } = require('drizzle-orm/postgres-js') as typeof import('drizzle-orm/postgres-js', {
  with: { 'resolution-mode': 'require' },
})
const { ConnectionsRepository } =
  require('../dist/oauth/connections.repository.js') as typeof import('../dist/oauth/connections.repository.js')
const { ConnectionsService } =
  require('../dist/oauth/connections.service.js') as typeof import('../dist/oauth/connections.service.js')
const { createApplication } = require('../dist/main.js') as typeof import('../dist/main.js')
const { createConnectionProtectedHandler } =
  require('../dist/auth/mcp-protected-handler.js') as typeof import('../dist/auth/mcp-protected-handler.js')
const { createMcpPlugins } =
  require('../dist/auth/mcp-plugins.js') as typeof import('../dist/auth/mcp-plugins.js')
const schema =
  require('../dist/database/schema/index.js') as typeof import('../dist/database/schema/index.js')
const origin = 'http://localhost:3000'
const secret = 'mcp-a0-test-only-secret-not-a-real-credential'
const resource = `${origin}/api/mcp`
const redirectUri = 'http://127.0.0.1:49152/callback'
type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
}

function createTestAuth(
  client: postgres.Sql,
  connections: InstanceType<typeof ConnectionsService>,
  metadataFetch?: Parameters<typeof createMcpPlugins>[2],
) {
  return betterAuth({
    baseURL: origin,
    basePath: '/api/auth',
    secret,
    trustedOrigins: [origin],
    database: drizzleAdapter(drizzle(client, { schema }), { provider: 'pg', schema }),
    plugins: createMcpPlugins(origin, connections, metadataFetch),
    emailAndPassword: { enabled: false },
    logger: { disabled: true },
  })
}

describe('MCP authorization over the real PostgreSQL provider boundary', () => {
  let client: postgres.Sql
  let auth: ReturnType<typeof createTestAuth>
  let cookie: string
  let connections: InstanceType<typeof ConnectionsService>
  let jwksServer: Server
  let protectedRequest: ReturnType<typeof createConnectionProtectedHandler>
  let verifiedTestDatabase = false
  const userId = `mcp-a0-${randomUUID()}`
  const clientId = `mcp-client-${randomUUID()}`

  beforeAll(async () => {
    client = postgres(process.env.DATABASE_URL!, { max: 2 })
    const [target] = await client`SELECT current_database() AS name`
    if (target.name !== 'resume_copilot_test')
      throw new Error('Refusing to mutate a non-test database')
    verifiedTestDatabase = true
    connections = new ConnectionsService(new ConnectionsRepository(drizzle(client, { schema })))
    auth = createTestAuth(client, connections)
    await auth.$context
    // Serve the actual provider's public keys, not a mocked token verifier.
    jwksServer = createServer((_request, response) => {
      void auth
        .handler(new Request(`${origin}/api/auth/jwks`))
        .then(async (result) => {
          response.writeHead(result.status, { 'content-type': 'application/json' })
          response.end(await result.text())
        })
        .catch(() => {
          response.writeHead(503)
          response.end()
        })
    })
    await new Promise<void>((resolve) => jwksServer.listen(0, '127.0.0.1', resolve))
    const address = jwksServer.address()
    if (!address || typeof address === 'string') throw new Error('Missing test JWKS listener')
    protectedRequest = createConnectionProtectedHandler(
      {
        issuer: `${origin}/api/auth`,
        audience: resource,
        requiredScopes: ['connection:read'],
        jwksUrl: `http://127.0.0.1:${address.port}/api/auth/jwks`,
      },
      connections,
      async (_request, claims) => Response.json(await connections.status(claims)),
    )
    // Seed identity; controlled Google login regressions live in auth.test.mts.
    // This does not establish real Google/browser interoperability.
    await client`INSERT INTO "user" (id, name, email, email_verified) VALUES (${userId}, 'MCP Test', ${`${userId}@example.test`}, true)`
    await client`INSERT INTO oauth_client
      (id, client_id, redirect_uris, scopes, token_endpoint_auth_method, application_type, grant_types, response_types, require_pkce)
      VALUES (${randomUUID()}, ${clientId}, ARRAY[${redirectUri}], ARRAY['connection:read', 'offline_access'],
        'none', 'native', ARRAY['authorization_code', 'refresh_token'], ARRAY['code'], true)`
    await client`INSERT INTO oauth_client_resource (id, client_id, resource_id) VALUES (${randomUUID()}, ${clientId}, ${resource})`
  })

  beforeEach(async () => {
    const token = randomUUID()
    await client`INSERT INTO session (id, token, user_id, expires_at) VALUES (${randomUUID()}, ${token}, ${userId}, now() + interval '7 days')`
    const signature = createHmac('sha256', secret).update(token).digest('base64')
    cookie = `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`
    expect((await auth.api.getSession({ headers: new Headers({ cookie }) }))?.user.id).toBe(userId)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  afterAll(async () => {
    if (jwksServer)
      await new Promise<void>((resolve, reject) =>
        jwksServer.close((error) => (error ? reject(error) : resolve())),
      )
    if (client) {
      try {
        if (verifiedTestDatabase) {
          await client`DELETE FROM oauth_client WHERE client_id = ${clientId}`
          await client`DELETE FROM "user" WHERE id = ${userId}`
        }
      } finally {
        await client.end()
      }
    }
  })

  async function authorize(requestConsent = true) {
    const verifier = randomUUID() + randomUUID()
    const query = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'connection:read offline_access',
      resource,
      state: randomUUID(),
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    })
    if (requestConsent) query.set('prompt', 'consent')
    const start = await auth.handler(
      new Request(`${origin}/api/auth/oauth2/authorize?${query}`, {
        headers: { cookie, accept: 'application/json' },
      }),
    )
    expect(start.status).toBe(200)
    const { url: consentUrl } = (await start.json()) as { url: string }
    expect(new URL(consentUrl, origin).pathname).toBe('/oauth/consent')
    const consent = await auth.handler(
      new Request(`${origin}/api/auth/oauth2/consent`, {
        method: 'POST',
        headers: { cookie, origin, 'content-type': 'application/json' },
        body: JSON.stringify({
          accept: true,
          oauth_query: new URL(consentUrl, origin).search.slice(1),
        }),
      }),
    )
    expect(consent.status).toBe(200)
    const { url } = (await consent.json()) as { url: string }
    const callback = new URL(url)
    expect(callback.searchParams.get('state')).toBe(query.get('state'))
    expect(callback.searchParams.get('code')).toBeTruthy()
    return { code: callback.searchParams.get('code')!, verifier }
  }

  async function exchange(code: string, verifier: string) {
    return auth.handler(
      new Request(`${origin}/api/auth/oauth2/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectUri,
          resource,
          code,
          code_verifier: verifier,
        }),
      }),
    )
  }

  async function refresh(refreshToken: string) {
    return auth.handler(
      new Request(`${origin}/api/auth/oauth2/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          resource,
          refresh_token: refreshToken,
        }),
      }),
    )
  }

  async function issue() {
    const { code, verifier } = await authorize()
    const response = await exchange(code, verifier)
    expect(response.status).toBe(200)
    return (await response.json()) as TokenResponse
  }

  function access(token: string) {
    return protectedRequest(
      new Request(resource, { headers: { authorization: `Bearer ${token}` } }),
    )
  }

  it('keeps offline access and refresh usable after browser sign-out and session expiry', async () => {
    const tokens = await issue()
    const signedOut = await auth.handler(
      new Request(`${origin}/api/auth/sign-out`, {
        method: 'POST',
        headers: { cookie, origin, 'content-type': 'application/json' },
        body: '{}',
      }),
    )
    expect(signedOut.status).toBe(200)
    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull()
    expect((await access(tokens.access_token)).status).toBe(200)
    // Beyond the browser session's seven-day lifetime, still below grant expiry.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000)
    const renewed = await refresh(tokens.refresh_token)
    expect(renewed.status).toBe(200)
    const latest = (await renewed.json()) as TokenResponse
    expect((await access(latest.access_token)).status).toBe(200)
  })

  it('revokes only an owned connection and immediately rejects its access and refresh credentials', async () => {
    const first = await issue()
    const second = await issue()
    const result = await access(first.access_token)
    expect(result.status).toBe(200)
    const status = (await result.json()) as {
      connectionId: string
      accountId: string
      displayName: string
      grantedScopes: string[]
    }
    expect(status).toEqual({
      connectionId: expect.any(String),
      accountId: userId,
      displayName: 'MCP Test',
      grantedScopes: ['connection:read', 'offline_access'],
    })
    const { connectionId } = status
    expect(await connections.revoke(`another-user-${randomUUID()}`, connectionId)).toBe(false)
    expect((await access(first.access_token)).status).toBe(200)
    expect(await connections.revoke(userId, connectionId)).toBe(true)
    expect(await connections.revoke(userId, connectionId)).toBe(true)
    expect((await access(first.access_token)).status).toBe(401)
    expect((await refresh(first.refresh_token)).status).toBe(400)
    expect((await access(second.access_token)).status).toBe(200)
    expect((await refresh(second.refresh_token)).status).toBe(200)
  })

  it('contains an old refresh-token replay to its own connection instead of all user/client grants', async () => {
    const first = await issue()
    const second = await issue()
    const rotation = await refresh(first.refresh_token)
    expect(rotation.status).toBe(200)
    const rotated = (await rotation.json()) as TokenResponse
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 31_000)
    expect((await refresh(first.refresh_token)).status).toBe(400)
    expect((await refresh(second.refresh_token)).status).toBe(200)
    expect((await access(second.access_token)).status).toBe(200)
    expect((await access(rotated.access_token)).status).toBe(401)
    expect((await refresh(rotated.refresh_token)).status).toBe(400)
  })

  it('authorizes a ChatGPT metadata client without user-supplied tokens or a pre-registered client ID', async () => {
    const metadataId = `https://chatgpt.com/oauth/codex/${randomUUID()}/client.json`
    const callback = `http://127.0.0.1:49152/callback/${randomUUID()}`
    // Substitute only the external HTTPS metadata transport; the provider,
    // consent, client persistence and token exchange use real PostgreSQL.
    const discoveredAuth = createTestAuth(client, connections, async (input) => {
      expect(String(input)).toBe(metadataId)
      return Response.json({
        client_id: metadataId,
        client_name: 'ChatGPT desktop',
        redirect_uris: [callback.replace(':49152', '')],
        scope: 'connection:read offline_access',
        application_type: 'native',
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      })
    })
    try {
      const verifier = randomUUID() + randomUUID()
      const query = new URLSearchParams({
        client_id: metadataId,
        response_type: 'code',
        redirect_uri: callback,
        scope: 'connection:read offline_access',
        resource,
        state: randomUUID(),
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256',
      })
      const start = await discoveredAuth.handler(
        new Request(`${origin}/api/auth/oauth2/authorize?${query}`, {
          headers: { cookie, accept: 'application/json' },
        }),
      )
      expect(start.status).toBe(200)
      const { url: consentUrl } = (await start.json()) as { url: string }
      expect(new URL(consentUrl, origin).pathname).toBe('/oauth/consent')
      const consent = await discoveredAuth.handler(
        new Request(`${origin}/api/auth/oauth2/consent`, {
          method: 'POST',
          headers: { cookie, origin, 'content-type': 'application/json' },
          body: JSON.stringify({
            accept: true,
            oauth_query: new URL(consentUrl, origin).search.slice(1),
          }),
        }),
      )
      expect(consent.status).toBe(200)
      const { url } = (await consent.json()) as { url: string }
      const code = new URL(url).searchParams.get('code')
      expect(code).toBeTruthy()
      const exchange = await discoveredAuth.handler(
        new Request(`${origin}/api/auth/oauth2/token`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: metadataId,
            redirect_uri: callback,
            code: code!,
            code_verifier: verifier,
            resource,
          }),
        }),
      )
      expect(exchange.status).toBe(200)
      const tokens = (await exchange.json()) as TokenResponse
      expect(tokens.refresh_token).toEqual(expect.any(String))
      expect((await access(tokens.access_token)).status).toBe(200)
      const outsidePolicy = new URLSearchParams(query)
      outsidePolicy.set('client_id', 'https://example.com/unauthorized/client.json')
      const rejected = await discoveredAuth.handler(
        new Request(`${origin}/api/auth/oauth2/authorize?${outsidePolicy}`, {
          headers: { cookie, accept: 'application/json' },
        }),
      )
      expect(rejected.status).toBe(400)
    } finally {
      await client`DELETE FROM oauth_client WHERE client_id = ${metadataId}`
    }
  })

  it('does not extend an authorization past 30 days by refreshing on day 29', async () => {
    const authorizedAt = Date.now()
    const { code, verifier } = await authorize()
    const initial = await exchange(code, verifier)
    expect(initial.status).toBe(200)
    const tokens = (await initial.json()) as TokenResponse
    // Fake only the clock; keep real PostgreSQL/network timers running.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(authorizedAt + 29 * 24 * 60 * 60 * 1000)
    const day29 = await refresh(tokens.refresh_token)
    expect(day29.status).toBe(200)
    const renewed = (await day29.json()) as TokenResponse
    vi.setSystemTime(authorizedAt + 31 * 24 * 60 * 60 * 1000)
    const afterDeadline = await refresh(renewed.refresh_token)
    expect(afterDeadline.status).toBe(400)
    expect(await afterDeadline.json()).toMatchObject({ error: 'invalid_grant' })
  })

  it('rejects a still-valid signed access token when its connection reaches the absolute deadline', async () => {
    const authorizedAt = Math.floor(Date.now() / 1000) * 1000
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(authorizedAt)
    const { code, verifier } = await authorize()
    const initial = await exchange(code, verifier)
    expect(initial.status).toBe(200)
    const tokens = (await initial.json()) as TokenResponse
    vi.setSystemTime(authorizedAt + 30 * 24 * 60 * 60 * 1000 - 10_000)
    const renewed = await refresh(tokens.refresh_token)
    expect(renewed.status).toBe(200)
    const latest = (await renewed.json()) as TokenResponse
    const request = () =>
      new Request(resource, { headers: { authorization: `Bearer ${latest.access_token}` } })
    expect((await protectedRequest(request())).status).toBe(200)
    // Only ten seconds have elapsed: the JWT's own 15-minute expiry is insufficient.
    vi.setSystemTime(authorizedAt + 30 * 24 * 60 * 60 * 1000)
    const expired = await protectedRequest(request())
    expect(expired.status).toBe(401)
    expect(expired.headers.get('www-authenticate')).toContain('invalid_token')
  })

  it('does not let the refresh retry window bypass the absolute connection deadline', async () => {
    const authorizedAt = Math.floor(Date.now() / 1000) * 1000
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(authorizedAt)
    const { code, verifier } = await authorize()
    const initial = await exchange(code, verifier)
    expect(initial.status).toBe(200)
    const tokens = (await initial.json()) as TokenResponse
    vi.setSystemTime(authorizedAt + 30 * 24 * 60 * 60 * 1000 - 10_000)
    expect((await refresh(tokens.refresh_token)).status).toBe(200)
    // A retry is allowed before expiry, but not ten seconds later at the deadline.
    expect((await refresh(tokens.refresh_token)).status).toBe(200)
    vi.setSystemTime(authorizedAt + 30 * 24 * 60 * 60 * 1000)
    const retry = await refresh(tokens.refresh_token)
    expect(retry.status).toBe(400)
    expect(await retry.json()).toMatchObject({ error: 'invalid_grant' })
  })

  it('keeps separate consent deadlines even when the first code exchange is delayed', async () => {
    const authorizedAt = Math.floor(Date.now() / 1000) * 1000
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(authorizedAt)
    const first = await authorize()
    vi.setSystemTime(authorizedAt + 5 * 60 * 1000)
    const firstResponse = await exchange(first.code, first.verifier)
    expect(firstResponse.status).toBe(200)
    const firstTokens = (await firstResponse.json()) as TokenResponse
    // Prior consent must not be silently reused when prompt=consent is omitted.
    const second = await authorize(false)
    const secondResponse = await exchange(second.code, second.verifier)
    expect(secondResponse.status).toBe(200)
    const secondTokens = (await secondResponse.json()) as TokenResponse
    vi.setSystemTime(authorizedAt + 30 * 24 * 60 * 60 * 1000)
    // Both refresh tokens were issued at the same time, but consent was not.
    expect((await refresh(firstTokens.refresh_token)).status).toBe(400)
    expect((await refresh(secondTokens.refresh_token)).status).toBe(200)
  })

  it('issues a 15-minute credential only after consent and PKCE exchange', async () => {
    const { code, verifier } = await authorize()
    const response = await exchange(code, verifier)
    expect(response.status).toBe(200)
    const tokens = (await response.json()) as TokenResponse
    expect(tokens.expires_in).toBe(900)
    expect(tokens.access_token).toEqual(expect.any(String))
    expect(tokens.refresh_token).toEqual(expect.any(String))
    expect(tokens.scope.split(' ').sort()).toEqual(['connection:read', 'offline_access'])
  })

  it('exposes native loopback discovery and a bearer challenge without weakening browser Origin checks', async () => {
    const oldEnabled = process.env.MCP_ENABLED
    const oldHost = process.env.HOST
    const oldSecret = process.env.BETTER_AUTH_SECRET
    process.env.MCP_ENABLED = 'true'
    process.env.HOST = '127.0.0.1'
    process.env.BETTER_AUTH_SECRET = secret
    let app: Awaited<ReturnType<typeof createApplication>> | undefined
    try {
      app = await createApplication()
      await app.listen(0, '127.0.0.1')
      const address = app.getHttpServer().address()
      if (!address || typeof address === 'string') throw new Error('Missing API listener')
      const base = `http://127.0.0.1:${address.port}`
      const metadata = await fetch(`${base}/.well-known/oauth-protected-resource/api/mcp`)
      expect(metadata.status).toBe(200)
      expect(await metadata.json()).toMatchObject({
        resource,
        authorization_servers: [`${origin}/api/auth`],
      })
      const issuer = await fetch(`${base}/.well-known/oauth-authorization-server/api/auth`)
      expect(issuer.status).toBe(200)
      expect(await issuer.json()).toMatchObject({
        issuer: `${origin}/api/auth`,
        authorization_response_iss_parameter_supported: true,
        client_id_metadata_document_supported: true,
      })
      const mcp = await fetch(`${base}/api/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      expect(mcp.status).toBe(401)
      expect(mcp.headers.get('www-authenticate')).toContain('resource_metadata')
      const credentials = await issue()
      const invoke = (id: number, method: string, params: object) =>
        fetch(`${base}/api/mcp`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${credentials.access_token}`,
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream',
          },
          body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
        })
      const initialize = await invoke(1, 'initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      })
      expect(initialize.status).toBe(200)
      const tools = await invoke(2, 'tools/list', {})
      expect(tools.status).toBe(200)
      expect(await tools.text()).toContain('get_connection_status')
      const call = await invoke(3, 'tools/call', { name: 'get_connection_status', arguments: {} })
      expect(call.status).toBe(200)
      const result = await call.text()
      expect(result).toContain(userId)
      expect(result).toContain('MCP Test')
      expect(result).not.toContain(`${userId}@example.test`)
      const refreshed = await fetch(`${base}/api/auth/oauth2/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          resource,
          refresh_token: credentials.refresh_token,
        }),
      })
      expect(refreshed.status).toBe(200)
      const refreshedTokens = (await refreshed.json()) as TokenResponse
      const afterRefresh = await fetch(`${base}/api/mcp`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${refreshedTokens.access_token}`,
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: { name: 'get_connection_status', arguments: {} },
        }),
      })
      expect(afterRefresh.status).toBe(200)
      expect(await afterRefresh.text()).toContain(userId)
      const token = await fetch(`${base}/api/auth/oauth2/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          code: 'invalid',
        }),
      })
      expect(token.status).toBe(400)
      const browserWrite = await fetch(`${base}/api/auth/sign-out`, { method: 'POST', body: '{}' })
      expect(browserWrite.status).toBe(403)
    } finally {
      if (app) await app.close()
      if (oldEnabled === undefined) delete process.env.MCP_ENABLED
      else process.env.MCP_ENABLED = oldEnabled
      if (oldHost === undefined) delete process.env.HOST
      else process.env.HOST = oldHost
      if (oldSecret === undefined) delete process.env.BETTER_AUTH_SECRET
      else process.env.BETTER_AUTH_SECRET = oldSecret
    }
  })

  it('does not let an ordinary signed-in user create OAuth clients in the pre-registered-client slice', async () => {
    const response = await auth.handler(
      new Request(`${origin}/api/auth/oauth2/create-client`, {
        method: 'POST',
        headers: { cookie, origin, 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Unapproved client',
          scope: 'connection:read offline_access',
          application_type: 'native',
          redirect_uris: ['http://127.0.0.1:49152/callback'],
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
        }),
      }),
    )
    expect(response.status).toBe(401)
  })
})
