import {
  defaultExperience,
  defaultProjects,
  defaultResumeData,
  type ResumeData,
} from '@resume-copilot/contracts'
import type { Miniflare } from 'miniflare'
import { createHash } from 'node:crypto'
import { createTestRuntime } from './worker.fixture.cjs'
import { afterAll, beforeAll, expect, test } from 'vitest'

let runtime: Miniflare
let fixture: Awaited<ReturnType<typeof createTestRuntime>>
const origin = 'https://resume.example.test'
const sampleJpeg = Buffer.from([
  255, 216, 255, 192, 0, 11, 8, 1, 0, 1, 0, 1, 1, 17, 0, 255, 217,
]).toString('base64')
const cookieHeader = (response: { headers: Headers }) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
async function login(worker = runtime, oauthQuery?: string) {
  const start = await worker.dispatchFetch(origin + '/api/auth/sign-in/social', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({
      provider: 'google',
      callbackURL: oauthQuery ? `/oauth/consent?${oauthQuery}` : '/dashboard/resumes',
      ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
    }),
  })
  expect(start.status).toBe(200)
  const { url } = (await start.json()) as { url: string }
  expect(new URL(url).searchParams.get('redirect_uri')).toBe(origin + '/api/auth/callback/google')
  const state = new URL(url).searchParams.get('state')!
  const callback = await worker.dispatchFetch(
    origin + '/api/auth/callback/google?code=controlled-code&state=' + encodeURIComponent(state),
    {
      redirect: 'manual',
      headers: { cookie: cookieHeader(start), accept: 'text/html', 'sec-fetch-mode': 'navigate' },
    },
  )
  return { callback, cookie: cookieHeader(callback) }
}

beforeAll(async () => {
  fixture = await createTestRuntime({ origin })
  runtime = fixture.runtime
})
afterAll(async () => runtime?.dispose())

test('the Workers API exposes liveness and real D1 readiness', async () => {
  const live = await runtime.dispatchFetch('https://resume.example.test/api/health')
  expect(live.status).toBe(200)
  expect(await live.json()).toEqual({ status: 'ok' })
  const ready = await runtime.dispatchFetch('https://resume.example.test/api/health/ready')
  expect(ready.status).toBe(200)
  expect(await ready.json()).toEqual({ status: 'ready', checks: { database: 'up' } })
})

test('Google login creates a D1 session and persists owner-scoped resume edits', async () => {
  const { callback, cookie } = await login()
  expect(callback.status).toBe(302)
  expect(new URL(callback.headers.get('location')!, origin).href).toBe(
    origin + '/dashboard/resumes',
  )
  const me = await runtime.dispatchFetch(origin + '/api/me', { headers: { cookie } })
  expect(me.status).toBe(200)
  expect(await me.json()).toMatchObject({ data: { email: 'owner@example.test' }, error: null })
  const headers = { cookie, origin, 'content-type': 'application/json' }
  const created = await runtime.dispatchFetch(origin + '/api/resumes', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'CF Resume' }),
  })
  expect(created.status).toBe(201)
  const { data: resume } = (await created.json()) as {
    data: { id: string; data: unknown; createdAt: string }
  }
  expect(Number.isNaN(Date.parse(resume.createdAt))).toBe(false)
  const edited = await runtime.dispatchFetch(origin + '/api/resumes/' + resume.id, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ title: 'Edited', data: resume.data }),
  })
  expect(edited.status).toBe(200)
  const reopened = await runtime.dispatchFetch(origin + '/api/resumes/' + resume.id, { headers })
  expect(await reopened.json()).toMatchObject({
    data: { id: resume.id, title: 'Edited', data: resume.data },
  })
  fixture.setGoogleProfile({
    sub: 'google-test-2',
    email: 'other@example.test',
    email_verified: true,
    name: 'Other',
  })
  const other = await login()
  const denied = await runtime.dispatchFetch(origin + '/api/resumes/' + resume.id, {
    headers: { cookie: other.cookie },
  })
  expect(denied.status).toBe(404)
  const otherHeaders = { ...headers, cookie: other.cookie }
  for (const method of ['PATCH', 'DELETE']) {
    const response = await runtime.dispatchFetch(origin + '/api/resumes/' + resume.id, {
      method,
      headers: otherHeaders,
      ...(method === 'PATCH' ? { body: JSON.stringify({ title: 'Stolen' }) } : {}),
    })
    expect(response.status).toBe(404)
  }
  const list = await runtime.dispatchFetch(origin + '/api/resumes', { headers: otherHeaders })
  expect(await list.json()).toMatchObject({ data: [] })

  const removed = await runtime.dispatchFetch(origin + '/api/resumes/' + resume.id, {
    method: 'DELETE',
    headers,
  })
  expect(removed.status).toBe(200)
  expect(
    (await runtime.dispatchFetch(origin + '/api/resumes/' + resume.id, { headers })).status,
  ).toBe(404)
})

test('authentication and trusted Origin are required and retired PDF export is absent', async () => {
  expect((await runtime.dispatchFetch(origin + '/api/resumes')).status).toBe(401)
  expect((await runtime.dispatchFetch(origin + '/api/resumes', { method: 'POST' })).status).toBe(
    403,
  )
  expect(
    (
      await runtime.dispatchFetch(origin + '/api/export-pdf', {
        method: 'POST',
        headers: { origin },
      })
    ).status,
  ).toBe(404)
})

test('Google identity stays stable and matching email does not silently link accounts', async () => {
  const owner = {
    sub: 'identity-owner',
    email: 'identity@example.test',
    email_verified: true,
    name: 'Identity',
  }
  fixture.setGoogleProfile(owner)
  const first = await login()
  const getMe = async (cookie: string) =>
    (await runtime.dispatchFetch(origin + '/api/me', { headers: { cookie } })).json() as Promise<{
      data: { id: string }
    }>
  const identity = await getMe(first.cookie)
  const returning = await login()
  expect((await getMe(returning.cookie)).data.id).toBe(identity.data.id)
  fixture.setGoogleProfile({ ...owner, sub: 'different-provider-account' })
  const mismatch = await login()
  expect(
    (await runtime.dispatchFetch(origin + '/api/me', { headers: { cookie: mismatch.cookie } }))
      .status,
  ).toBe(401)
})

test('unverified Google emails, fabricated cookies and invalid callback state cannot establish identity', async () => {
  fixture.setGoogleProfile({
    sub: 'unverified',
    email: 'unverified@example.test',
    email_verified: false,
    name: 'Unverified',
  })
  const unverified = await login()
  expect(
    (await runtime.dispatchFetch(origin + '/api/me', { headers: { cookie: unverified.cookie } }))
      .status,
  ).toBe(401)
  const database = await runtime.getD1Database('DB')
  expect(
    await database
      .prepare('SELECT id FROM user WHERE email = ?')
      .bind('unverified@example.test')
      .first(),
  ).toBeNull()
  const invalid = await runtime.dispatchFetch(
    origin + '/api/auth/callback/google?code=test&state=forged',
    { redirect: 'manual' },
  )
  expect(invalid.headers.get('location')).toContain('error=')
  expect(
    (
      await runtime.dispatchFetch(origin + '/api/me', {
        headers: {
          cookie: '__Secure-better-auth.session_token=forged.signature',
          'x-user-id': 'identity-owner',
        },
      })
    ).status,
  ).toBe(401)
  for (const path of ['/api/auth/sign-in/email', '/api/auth/sign-up/email']) {
    expect(
      (
        await runtime.dispatchFetch(origin + path, {
          method: 'POST',
          headers: { origin, 'content-type': 'application/json' },
          body: JSON.stringify({
            name: 'Test',
            email: 'password@example.test',
            password: 'test-password',
          }),
        })
      ).status,
    ).toBe(400)
  }
})

test('D1 sessions expire, renew after the update interval and sign-out revokes only the current session', async () => {
  fixture.setGoogleProfile({
    sub: 'sessions',
    email: 'sessions@example.test',
    email_verified: true,
    name: 'Sessions',
  })
  const first = await login()
  const second = await login()
  const session = async (cookie: string) =>
    (
      await runtime.dispatchFetch(origin + '/api/auth/get-session', { headers: { cookie } })
    ).json() as Promise<{ session: { id: string; updatedAt: string } }>
  const initial = await session(first.cookie)
  const database = await runtime.getD1Database('DB')
  await database
    .prepare('UPDATE session SET updated_at = ?, expires_at = ? WHERE id = ?')
    .bind(Date.now() - 25 * 3600000, Date.now() + 6 * 86400000 - 60000, initial.session.id)
    .run()
  const renewed = await session(first.cookie)
  expect(Date.parse(renewed.session.updatedAt)).toBeGreaterThan(Date.now() - 60000)
  expect((await session(first.cookie)).session.updatedAt).toBe(renewed.session.updatedAt)
  const signout = await runtime.dispatchFetch(origin + '/api/auth/sign-out', {
    method: 'POST',
    headers: { cookie: first.cookie, origin, 'content-type': 'application/json' },
    body: '{}',
  })
  expect(signout.status).toBe(200)
  expect(
    (await runtime.dispatchFetch(origin + '/api/me', { headers: { cookie: first.cookie } })).status,
  ).toBe(401)
  expect(
    (await runtime.dispatchFetch(origin + '/api/me', { headers: { cookie: second.cookie } }))
      .status,
  ).toBe(200)
  const active = await session(second.cookie)
  await database
    .prepare('UPDATE session SET expires_at = ? WHERE id = ?')
    .bind(Date.now() - 1000, active.session.id)
    .run()
  expect(
    (await runtime.dispatchFetch(origin + '/api/me', { headers: { cookie: second.cookie } }))
      .status,
  ).toBe(401)
})

test('body errors stay sanitized and origin protection runs before body parsing', async () => {
  for (const path of [
    '/api/resumes',
    '/api/auth/sign-in/social',
    '/api/new-business-route',
    '/api/mcp',
  ]) {
    for (const badOrigin of [undefined, 'https://evil.example.test', origin + '.evil.test']) {
      const headers = {
        'content-type': 'application/json',
        ...(badOrigin ? { origin: badOrigin } : {}),
      }
      const response = await runtime.dispatchFetch(origin + path, {
        method: 'POST',
        headers,
        body: '{private-json',
      })
      expect(response.status).toBe(403)
      expect(response.headers.get('cache-control')).toBe('no-store')
    }
    const large = await runtime.dispatchFetch(origin + path, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ private: 'x'.repeat(1048576) }),
    })
    expect(large.status).toBe(413)
    expect(await large.text()).not.toContain('private')
  }
  const malformed = await runtime.dispatchFetch(origin + '/api/resumes', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', 'x-request-id': 'forged' },
    body: '{private-json',
  })
  expect(malformed.status).toBe(400)
  expect(await malformed.json()).toEqual({
    data: null,
    error: { code: 'BAD_REQUEST', message: 'Bad Request' },
  })
  expect(malformed.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
})

test('failed Worker initialization returns the public error envelope without configuration values', async () => {
  const invalid = await createTestRuntime({
    origin,
    bindings: { BETTER_AUTH_SECRET: 'private-invalid-value' },
  })
  try {
    const response = await invalid.runtime.dispatchFetch(origin + '/api/health')
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' },
    })
  } finally {
    await invalid.runtime.dispose()
  }
})

const mcpResource = origin + '/api/mcp'
const mcpMetadata = origin + '/.well-known/oauth-protected-resource/api/mcp'
const chatgptClient = {
  MCP_CLIENT_ID: 'chatgpt-test-client',
  MCP_CLIENT_SECRET: 'chatgpt-test-secret-with-more-than-32-characters',
  MCP_REDIRECT_URI: 'https://chatgpt.com/connector/oauth/test-callback',
}

test('an unauthenticated MCP tool call advertises OAuth discovery without returning data', async () => {
  const enabled = await createTestRuntime({ origin, bindings: chatgptClient })
  try {
    const response = await enabled.runtime.dispatchFetch(mcpResource, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'list_resumes', arguments: {} },
      }),
    })
    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toContain(`resource_metadata="${mcpMetadata}"`)
    const metadata = await enabled.runtime.dispatchFetch(mcpMetadata)
    expect(metadata.status).toBe(200)
    expect(await metadata.json()).toMatchObject({
      resource: mcpResource,
      authorization_servers: [origin + '/api/auth'],
      scopes_supported: [
        'resumes:read',
        'resumes:read_full',
        'resumes:write',
        'resumes:edit',
        'resumes:manage',
      ],
    })
    const discovery = await enabled.runtime.dispatchFetch(
      origin + '/.well-known/oauth-authorization-server/api/auth',
    )
    expect(discovery.status).toBe(200)
    expect(await discovery.json()).toMatchObject({
      issuer: origin + '/api/auth',
      authorization_endpoint: origin + '/api/auth/oauth2/authorize',
      token_endpoint: origin + '/api/auth/oauth2/token',
      code_challenge_methods_supported: ['S256'],
    })
  } finally {
    await enabled.runtime.dispose()
  }
})

test('ChatGPT can authorize through Google and page through only the connected user’s titles and IDs', async () => {
  const enabled = await createTestRuntime({ origin, bindings: chatgptClient })
  const worker = enabled.runtime
  const verifier = 'a-repeatable-high-entropy-fixture-for-the-pkce-verifier'
  const token = (fields: Record<string, string>) =>
    worker.dispatchFetch(origin + '/api/auth/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: chatgptClient.MCP_CLIENT_ID,
        client_secret: chatgptClient.MCP_CLIENT_SECRET,
        resource: mcpResource,
        ...fields,
      }).toString(),
    })
  try {
    const query = new URLSearchParams({
      client_id: chatgptClient.MCP_CLIENT_ID,
      redirect_uri: chatgptClient.MCP_REDIRECT_URI,
      response_type: 'code',
      resource: mcpResource,
      scope: 'resumes:read offline_access',
      state: 'client-session-state',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    })
    const authorize = origin + '/api/auth/oauth2/authorize'
    const visit = (url: string, cookie?: string) =>
      worker.dispatchFetch(url, {
        redirect: 'manual',
        headers: {
          accept: 'text/html',
          'sec-fetch-mode': 'navigate',
          ...(cookie ? { cookie } : {}),
        },
      })
    const oauthRedirect = async (response: Awaited<ReturnType<typeof visit>>) => {
      if (response.status === 302) return new URL(response.headers.get('location')!, origin)
      expect(response.status).toBe(200)
      const body = (await response.json()) as { redirect: boolean; url: string }
      expect(body.redirect).toBe(true)
      return new URL(body.url, origin)
    }
    const signIn = await visit(authorize + '?' + query)
    const signInUrl = await oauthRedirect(signIn)
    expect(signInUrl.pathname).toBe('/login')
    const signedIn = await login(worker, signInUrl.search.slice(1))
    const consentPage = await oauthRedirect(signedIn.callback)
    expect(consentPage.pathname).toBe('/oauth/consent')
    expect(consentPage.searchParams.get('scope')).toBe('resumes:read offline_access')
    const consent = (accept: boolean, signedQuery: URL) =>
      worker.dispatchFetch(origin + '/api/auth/oauth2/consent', {
        method: 'POST',
        headers: { origin, cookie: signedIn.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ accept, oauth_query: signedQuery.search.slice(1) }),
      })
    const declined = await consent(false, consentPage)
    expect(declined.status).toBe(200)
    const declinedBody = (await declined.json()) as { url: string }
    const denial = new URL(declinedBody.url)
    expect(denial.searchParams.get('error')).toBe('access_denied')
    expect(denial.searchParams.has('code')).toBe(false)

    const wrongCallback = new URLSearchParams(query)
    wrongCallback.set('redirect_uri', 'https://chatgpt.com/connector/oauth/other')
    const rejected = await visit(authorize + '?' + wrongCallback, signedIn.cookie)
    const rejectedTarget = await oauthRedirect(rejected)
    expect(rejectedTarget.origin).toBe(origin)
    expect(rejectedTarget.searchParams.has('code')).toBe(false)
    const wrongResource = new URLSearchParams(query)
    wrongResource.set('resource', 'https://other.example.test/api/mcp')
    const resourceError = await oauthRedirect(
      await visit(authorize + '?' + wrongResource, signedIn.cookie),
    )
    expect(resourceError.searchParams.get('error')).toBe('invalid_target')

    const authorizeAgain = await visit(authorize + '?' + query, signedIn.cookie)
    const consentAgain = await oauthRedirect(authorizeAgain)
    expect(consentAgain.pathname).toBe('/oauth/consent')
    const tampered = new URL(consentAgain)
    tampered.searchParams.set('scope', 'resumes:read')
    expect((await consent(true, tampered)).status).toBe(400)
    const accepted = await consent(true, consentAgain)
    expect(accepted.status).toBe(200)
    const acceptedBody = (await accepted.json()) as { url: string }
    const redirect = new URL(acceptedBody.url)
    expect(redirect.origin + redirect.pathname).toBe(chatgptClient.MCP_REDIRECT_URI)
    expect(redirect.searchParams.get('state')).toBe('client-session-state')
    expect(redirect.searchParams.get('iss')).toBe(origin + '/api/auth')
    const exchange = {
      grant_type: 'authorization_code',
      redirect_uri: chatgptClient.MCP_REDIRECT_URI,
      code: redirect.searchParams.get('code')!,
      code_verifier: verifier,
    }
    expect(exchange.code).toBeTruthy()
    const wrongVerifier = await token({ ...exchange, code_verifier: 'x'.repeat(48) })
    expect(wrongVerifier.status).toBe(401)
    expect(await wrongVerifier.json()).toMatchObject({ error: 'invalid_request' })
    // The provider consumes the code after a failed verifier, so start a fresh authorization.
    const newAuthorization = await oauthRedirect(
      await visit(authorize + '?' + query, signedIn.cookie),
    )
    expect(newAuthorization.searchParams.has('code')).toBe(true)
    const validExchange = { ...exchange, code: newAuthorization.searchParams.get('code')! }
    const exchanged = await token(validExchange)
    expect(exchanged.status).toBe(200)
    const credentials = (await exchanged.json()) as { access_token: string; refresh_token: string }
    expect(credentials.refresh_token).toBeTruthy()
    const refreshed = await token({
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
    })
    expect(refreshed.status).toBe(200)
    const nextCredentials = (await refreshed.json()) as { access_token: string }
    expect(nextCredentials.access_token).not.toBe(credentials.access_token)

    const create = async (cookie: string, title: string) => {
      const response = await worker.dispatchFetch(origin + '/api/resumes', {
        method: 'POST',
        headers: { origin, cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ title, description: 'Owner-only resume contents' }),
      })
      expect(response.status).toBe(201)
      const { data } = (await response.json()) as { data: { id: string } }
      return { id: data.id, title }
    }
    const expected = await Promise.all(
      Array.from({ length: 26 }, (_, i) => create(signedIn.cookie, 'Resume ' + i)),
    )
    enabled.setGoogleProfile({
      sub: 'mcp-other-account',
      email: 'mcp-other@example.test',
      email_verified: true,
      name: 'Other',
    })
    const other = await login(worker)
    await create(other.cookie, 'Another account')
    const call = (
      method: string,
      params?: object,
      access = nextCredentials.access_token,
      requestOrigin?: string,
    ) =>
      worker.dispatchFetch(mcpResource, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          authorization: 'Bearer ' + access,
          ...(requestOrigin ? { origin: requestOrigin } : {}),
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      })
    expect((await call('tools/list', {}, credentials.refresh_token)).status).toBe(401)
    expect(
      (await call('tools/list', {}, nextCredentials.access_token, 'https://evil.example.test'))
        .status,
    ).toBe(403)
    const initialize = await call('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    })
    expect(initialize.status).toBe(200)
    expect(await initialize.json()).toMatchObject({ result: { protocolVersion: '2025-11-25' } })
    const tools = await call('tools/list')
    expect(await tools.json()).toMatchObject({
      result: {
        tools: [
          { name: 'list_resumes', annotations: { readOnlyHint: true } },
          { name: 'read_resume', annotations: { readOnlyHint: true } },
          { name: 'create_resume', annotations: { readOnlyHint: false, idempotentHint: true } },
          { name: 'update_resume', annotations: { readOnlyHint: false, destructiveHint: true } },
          {
            name: 'apply_resume_patch',
            annotations: { readOnlyHint: false, destructiveHint: true },
          },
          {
            name: 'update_resume_metadata',
            annotations: { readOnlyHint: false, destructiveHint: true },
          },
          { name: 'duplicate_resume', annotations: { readOnlyHint: false, idempotentHint: true } },
          { name: 'delete_resume', annotations: { readOnlyHint: false, destructiveHint: true } },
        ],
      },
    })
    const list = async (cursor?: string) => {
      const response = await call('tools/call', {
        name: 'list_resumes',
        arguments: cursor ? { cursor } : {},
      })
      expect(response.status).toBe(200)
      const { result } = (await response.json()) as {
        result: {
          structuredContent: { resumes: { id: string; title: string }[]; nextCursor: string | null }
        }
      }
      return result.structuredContent
    }
    const first = await list()
    expect(first.resumes).toHaveLength(25)
    expect(first.nextCursor).toBeTruthy()
    const second = await list(first.nextCursor!)
    expect(second.nextCursor).toBeNull()
    expect([...first.resumes, ...second.resumes]).toEqual(
      expected.sort((a, b) => a.id.localeCompare(b.id)),
    )
    const database = await worker.getD1Database('DB')
    const storedToken = createHash('sha256')
      .update(nextCredentials.access_token)
      .digest('base64url')
    // Arrange otherwise-valid credentials with the wrong audience, scope, and expiry.
    const setAudience = (resource: string) =>
      database
        .prepare('UPDATE oauth_access_token SET resources = ? WHERE token = ?')
        .bind(JSON.stringify([resource]), storedToken)
        .run()
    expect((await setAudience('https://other.example.test/api/mcp')).meta.changes).toBe(1)
    expect((await call('tools/list')).status).toBe(401)
    await setAudience(mcpResource)
    const setScopes = (scopes: string[]) =>
      database
        .prepare('UPDATE oauth_access_token SET scopes = ? WHERE token = ?')
        .bind(JSON.stringify(scopes), storedToken)
        .run()
    await setScopes(['offline_access'])
    const insufficient = await call('tools/list')
    expect(insufficient.status).toBe(403)
    expect(insufficient.headers.get('www-authenticate')).toContain('insufficient_scope')
    expect(
      (await call('tools/call', { name: 'read_resume', arguments: { resumeId: expected[0].id } }))
        .status,
    ).toBe(403)
    await setScopes(['resumes:read'])
    await database
      .prepare('UPDATE oauth_access_token SET expires_at = ? WHERE token = ?')
      .bind(Date.now() - 1000, storedToken)
      .run()
    const expired = await call('tools/list')
    expect(expired.status).toBe(401)
    expect(expired.headers.get('www-authenticate')).toContain('invalid_token')
    expect((await token(validExchange)).status).toBe(400)
  } finally {
    await worker.dispose()
  }
})

function mcpAuthorization(worker: Miniflare, scope = 'resumes:read offline_access') {
  const verifier = 'a-repeatable-high-entropy-fixture-for-the-pkce-verifier'
  const query = new URLSearchParams({
    client_id: chatgptClient.MCP_CLIENT_ID,
    redirect_uri: chatgptClient.MCP_REDIRECT_URI,
    response_type: 'code',
    resource: mcpResource,
    scope,
    state: 'mcp-tool-test',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  })
  const redirect = async (response: Awaited<ReturnType<Miniflare['dispatchFetch']>>) => {
    const location = response.headers.get('location')
    if (location) return new URL(location, origin)
    return new URL(((await response.json()) as { url: string }).url, origin)
  }
  const authorize = async (cookie: string) =>
    redirect(
      await worker.dispatchFetch(origin + '/api/auth/oauth2/authorize?' + query, {
        redirect: 'manual',
        headers: { cookie },
      }),
    )
  const accept = async (cookie: string, consent: URL) => {
    expect(consent.pathname).toBe('/oauth/consent')
    const response = await worker.dispatchFetch(origin + '/api/auth/oauth2/consent', {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ accept: true, oauth_query: consent.search.slice(1) }),
    })
    expect(response.status).toBe(200)
    const code = (await redirect(response)).searchParams.get('code')
    expect(code).toBeTruthy()
    return code!
  }
  const token = (params: Record<string, string>) =>
    worker.dispatchFetch(origin + '/api/auth/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: chatgptClient.MCP_CLIENT_ID,
        client_secret: chatgptClient.MCP_CLIENT_SECRET,
        resource: mcpResource,
        ...params,
      }).toString(),
    })
  const exchange = (code: string) =>
    token({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: chatgptClient.MCP_REDIRECT_URI,
    })
  const connect = async (cookie: string, consent: URL) => {
    const response = await exchange(await accept(cookie, consent))
    expect(response.status).toBe(200)
    return (await response.json()) as { access_token: string; refresh_token: string }
  }
  return { authorize, connect, exchange, token }
}

test('disconnecting ChatGPT revokes tokens and pending codes for only the signed-in account', async () => {
  const fixture = await createTestRuntime({ origin, bindings: chatgptClient })
  const worker = fixture.runtime
  const endpoint = origin + '/api/me/mcp-connection'
  const { authorize, connect, exchange, token } = mcpAuthorization(worker)
  const list = (accessToken: string) =>
    worker.dispatchFetch(mcpResource, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: 'Bearer ' + accessToken,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_resumes',
          arguments: {},
        },
      }),
    })
  try {
    const { cookie: owner } = await login(worker)
    const connected = await connect(owner, await authorize(owner))
    const pendingCode = (await authorize(owner)).searchParams.get('code')!
    expect(pendingCode).toBeTruthy()
    expect((await list(connected.access_token)).status).toBe(200)
    const connection = await worker.dispatchFetch(endpoint, { headers: { cookie: owner } })
    expect(connection.status).toBe(200)
    expect(await connection.json()).toMatchObject({
      data: { clientName: 'ChatGPT', scopes: ['resumes:read', 'offline_access'] },
    })
    expect((await worker.dispatchFetch(endpoint)).status).toBe(401)
    fixture.setGoogleProfile({
      sub: 'disconnect-other',
      email: 'disconnect-other@example.test',
      email_verified: true,
      name: 'Other',
    })
    const { cookie: other } = await login(worker)
    const otherConnection = await connect(other, await authorize(other))
    expect(
      (await worker.dispatchFetch(endpoint, { method: 'DELETE', headers: { cookie: owner } }))
        .status,
    ).toBe(403)
    const disconnected = await worker.dispatchFetch(endpoint, {
      method: 'DELETE',
      headers: { origin, cookie: owner },
    })
    expect(disconnected.status).toBe(200)
    expect(
      await (await worker.dispatchFetch(endpoint, { headers: { cookie: owner } })).json(),
    ).toMatchObject({ data: null })
    expect((await list(connected.access_token)).status).toBe(401)
    expect(
      (await token({ grant_type: 'refresh_token', refresh_token: connected.refresh_token })).status,
    ).toBe(400)
    expect(
      (await worker.dispatchFetch(origin + '/api/me', { headers: { cookie: owner } })).status,
    ).toBe(200)
    expect((await list(otherConnection.access_token)).status).toBe(200)
    const reconnected = await connect(owner, await authorize(owner))
    expect((await exchange(pendingCode)).status).toBe(400)
    expect((await list(connected.access_token)).status).toBe(401)
    expect((await list(reconnected.access_token)).status).toBe(200)
  } finally {
    await worker.dispose()
  }
})

test('ChatGPT reads the complete owned resume only with full-read consent', async () => {
  const fixture = await createTestRuntime({ origin, bindings: chatgptClient })
  const worker = fixture.runtime
  const { authorize, connect } = mcpAuthorization(worker)
  const createResume = async (
    cookie: string,
    visibility: 'private' | 'public',
    oversized = false,
  ) => {
    const response = await worker.dispatchFetch(origin + '/api/resumes', {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Selected resume',
        description: 'Private dashboard note',
        visibility,
        data: {
          ...defaultResumeData,
          design: { template: 'meowth', density: 'compact', themeColor: '#102030' },
          typography: { preset: 'balanced', textSize: 11 },
          sectionOrder: ['summary', 'custom-notes', 'projects'],
          basics: {
            ...defaultResumeData.basics,
            email: 'personal@example.test',
            phone: '555-0123',
            location: '42 Private Street',
            website: { icon: '', label: 'Portfolio', link: 'https://personal.example.test' },
          },
          modules: {
            ...defaultResumeData.modules,
            'custom-notes': { id: 'custom-notes', name: 'Notes', visible: false, items: [] },
            summary: {
              id: 'summary',
              name: 'Summary',
              visible: true,
              content: 'Writes reliable software.',
              items: [{ id: 'summary-one', visible: true, summary: 'Older summary entry.' }],
            },
            experience: {
              ...defaultResumeData.modules.experience,
              items: [{ ...defaultExperience, id: 'work-one', company: 'Example Studio' }],
            },
            projects: {
              ...defaultResumeData.modules.projects,
              items: [
                {
                  ...defaultProjects,
                  id: 'project-one',
                  name: 'Internal project name',
                  summary: 'Built **automated tests**.',
                  website: {
                    icon: '',
                    label: 'Private link',
                    link: 'https://project.example.test',
                  },
                },
                {
                  ...defaultProjects,
                  id: 'project-two',
                  summary: oversized ? 'Long project text. '.repeat(4000) : 'Another project.',
                },
              ],
            },
          },
        },
      }),
    })
    expect(response.status).toBe(201)
    return (
      (await response.json()) as {
        data: { id: string; updatedAt: string; data: unknown }
      }
    ).data
  }
  try {
    const { cookie } = await login(worker)
    const { access_token: accessToken } = await connect(cookie, await authorize(cookie))
    const read = (resumeId: string, sections?: object, token = accessToken) =>
      worker.dispatchFetch(mcpResource, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'read_resume', arguments: { resumeId, sections } },
        }),
      })
    const metadata = (resume: { id: string; updatedAt: string }) => ({
      id: resume.id,
      title: 'Selected resume',
      version: Date.parse(resume.updatedAt),
    })
    const expectRead = async (response: Awaited<ReturnType<typeof read>>, expected: object) => {
      expect(response.status).toBe(200)
      const { result } = (await response.json()) as {
        result: { structuredContent?: unknown; content: { text: string }[] }
      }
      expect(result.structuredContent).toEqual(expected)
      expect(result.content.map(({ text }) => JSON.parse(text))).toEqual([expected])
    }
    const privateResume = await createResume(cookie, 'private')
    await expectRead(await read(privateResume.id), metadata(privateResume))
    const full = mcpAuthorization(worker, 'resumes:read_full offline_access')
    const { access_token: fullToken } = await full.connect(cookie, await full.authorize(cookie))
    await expectRead(await read(privateResume.id, undefined, fullToken), {
      ...metadata(privateResume),
      description: 'Private dashboard note',
      visibility: 'private',
      data: privateResume.data,
    })
    const connection = await worker.dispatchFetch(origin + '/api/me/mcp-connection', {
      headers: { cookie },
    })
    expect(await connection.json()).toMatchObject({
      data: { scopes: expect.arrayContaining(['resumes:read_full']) },
    })
    await expectRead(await read(privateResume.id), metadata(privateResume))
    const publicResume = await createResume(cookie, 'public')
    await expectRead(await read(publicResume.id, undefined, fullToken), {
      ...metadata(publicResume),
      description: 'Private dashboard note',
      visibility: 'public',
      data: publicResume.data,
    })
    await expectRead(
      await read(
        publicResume.id,
        { summary: true, projects: { fields: ['summary'], entryIds: ['project-one'] } },
        fullToken,
      ),
      {
        ...metadata(publicResume),
        description: 'Private dashboard note',
        visibility: 'public',
        sections: {
          summary: {
            content: 'Writes reliable software.',
            items: [{ id: 'summary-one', summary: 'Older summary entry.' }],
          },
          projects: [{ id: 'project-one', summary: 'Built **automated tests**.' }],
        },
      },
    )
    await expectRead(await read(privateResume.id, { projects: { entryIds: ['project-one'] } }), {
      ...metadata(privateResume),
      sections: {
        projects: [
          {
            id: 'project-one',
            name: 'Internal project name',
            description: '',
            date: '',
            summary: 'Built **automated tests**.',
          },
        ],
      },
    })
    await expectRead(await read(privateResume.id, { projects: { entryIds: ['missing'] } }), {
      ...metadata(privateResume),
      sections: { projects: [] },
    })
    const expectToolError = async (response: Awaited<ReturnType<typeof read>>) => {
      expect(response.status).toBe(200)
      const { result } = (await response.json()) as {
        result: { isError: boolean; structuredContent?: unknown; content: { text: string }[] }
      }
      expect(result.isError).toBe(true)
      expect(result.structuredContent).toBeUndefined()
      return result.content
    }
    await expectToolError(await read(privateResume.id, { basics: { fields: ['email'] } }))
    await expectToolError(await read(privateResume.id, { projects: { fields: ['website'] } }))
    const longResume = await createResume(cookie, 'private', true)
    expect(await expectToolError(await read(longResume.id, { projects: {} }))).toMatchObject([
      { text: expect.stringContaining('Resume selection is too large.') },
    ])
    expect(await expectToolError(await read(longResume.id, undefined, fullToken))).toMatchObject([
      { text: expect.stringContaining('Resume selection is too large.') },
    ])

    fixture.setGoogleProfile({
      sub: 'read-other-account',
      email: 'read-other@example.test',
      email_verified: true,
      name: 'Other',
    })
    const other = await login(worker)
    const otherResume = await createResume(other.cookie, 'public')
    const missing = await expectToolError(await read('2d680e50-efaa-419b-b138-d30cab4a603e'))
    expect(missing).toEqual([{ type: 'text', text: 'Resume not found.' }])
    expect(await expectToolError(await read(otherResume.id))).toEqual(missing)
    expect(await expectToolError(await read(otherResume.id, undefined, fullToken))).toEqual(missing)
  } finally {
    await worker.dispose()
  }
})

test('ChatGPT needs write consent to create a private resume and can safely retry creation', async () => {
  const fixture = await createTestRuntime({ origin, bindings: chatgptClient })
  const worker = fixture.runtime
  const create = async (accessToken: string, args: object) => {
    const response = await worker.dispatchFetch(mcpResource, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: 'Bearer ' + accessToken,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'create_resume', arguments: args },
      }),
    })
    expect(response.status).toBe(200)
    return (
      (await response.json()) as {
        result: {
          isError?: boolean
          structuredContent?: { id: string; title: string; version: number; editorUrl: string }
          _meta?: Record<string, unknown>
          content: { text: string }[]
        }
      }
    ).result
  }
  try {
    const { cookie } = await login(worker)
    const read = mcpAuthorization(worker)
    const readGrant = await read.connect(cookie, await read.authorize(cookie))
    const input = { title: 'Frontend internship', requestKey: 'new-frontend-resume' }
    const denied = await create(readGrant.access_token, input)
    expect(denied.isError).toBe(true)
    expect(denied._meta?.['mcp/www_authenticate']).toEqual([
      expect.stringContaining('scope="resumes:write"'),
    ])

    const write = mcpAuthorization(worker, 'resumes:read resumes:write offline_access')
    const writeGrant = await write.connect(cookie, await write.authorize(cookie))
    const connection = await worker.dispatchFetch(origin + '/api/me/mcp-connection', {
      headers: { cookie },
    })
    expect(await connection.json()).toMatchObject({
      data: { clientName: 'ChatGPT', scopes: ['resumes:read', 'resumes:write', 'offline_access'] },
    })
    expect((await create(readGrant.access_token, input)).isError).toBe(true)
    const refreshed = await read.token({
      grant_type: 'refresh_token',
      refresh_token: readGrant.refresh_token,
    })
    expect(refreshed.status).toBe(200)
    const refreshedRead = (await refreshed.json()) as { access_token: string }
    expect((await create(refreshedRead.access_token, input)).isError).toBe(true)
    const [first, retry] = await Promise.all([
      create(writeGrant.access_token, input),
      create(writeGrant.access_token, input),
    ])
    const result = first.structuredContent!
    expect(result).toEqual({
      id: expect.any(String),
      title: input.title,
      version: expect.any(Number),
      editorUrl: origin + '/builder/' + result?.id,
    })
    expect(retry.structuredContent).toEqual(result)
    expect(JSON.parse(first.content[0].text)).toEqual(result)
    const saved = await worker.dispatchFetch(origin + '/api/resumes/' + result.id, {
      headers: { cookie },
    })
    expect(saved.status).toBe(200)
    const savedBody = await saved.json()
    expect(savedBody).toMatchObject({
      data: { id: result.id, title: input.title, visibility: 'private', data: defaultResumeData },
    })
    expect(Date.parse((savedBody as { data: { updatedAt: string } }).data.updatedAt)).toBe(
      result.version,
    )

    const conflict = await create(writeGrant.access_token, { ...input, title: 'Different resume' })
    expect(conflict).toMatchObject({
      isError: true,
      content: [{ text: expect.stringContaining('already used') }],
    })
    const malformed = await create(writeGrant.access_token, {
      ...input,
      requestKey: 'invalid',
      visibility: 'public',
      data: { projects: [{ id: 'caller-supplied', name: 'Invalid' }] },
    })
    expect(malformed.isError).toBe(true)
    const list = () => worker.dispatchFetch(origin + '/api/resumes', { headers: { cookie } })
    expect(await (await list()).json()).toMatchObject({ data: [{ id: result.id }] })

    const prefilled = await create(writeGrant.access_token, {
      title: 'Prefilled draft',
      requestKey: 'prefilled',
      data: {
        basics: { name: 'Test Candidate', email: 'test-contact@example.test' },
        summary: 'Software developer',
        projects: [{ name: 'Test project', summary: '**Built** a prototype.' }],
      },
    })
    const draft = prefilled.structuredContent!
    expect(draft).toEqual({
      id: expect.any(String),
      title: 'Prefilled draft',
      version: expect.any(Number),
      editorUrl: origin + '/builder/' + draft?.id,
    })
    expect(JSON.parse(prefilled.content[0].text)).toEqual(draft)
    const reopened = await worker.dispatchFetch(origin + '/api/resumes/' + draft.id, {
      headers: { cookie },
    })
    expect(await reopened.json()).toMatchObject({
      data: {
        visibility: 'private',
        data: {
          basics: {
            ...defaultResumeData.basics,
            name: 'Test Candidate',
            email: 'test-contact@example.test',
          },
          modules: {
            summary: { content: 'Software developer' },
            projects: {
              items: [
                {
                  ...defaultProjects,
                  id: expect.stringMatching(/^[0-9a-f-]{36}$/),
                  name: 'Test project',
                  summary: '**Built** a prototype.',
                },
              ],
            },
          },
        },
      },
    })

    fixture.setGoogleProfile({
      sub: 'create-other-account',
      email: 'create-other@example.test',
      email_verified: true,
      name: 'Other',
    })
    const other = await login(worker)
    const writeOnly = mcpAuthorization(worker, 'resumes:write')
    const otherAccess = await writeOnly.connect(
      other.cookie,
      await writeOnly.authorize(other.cookie),
    )
    const otherCreated = await create(otherAccess.access_token, input)
    expect(otherCreated.structuredContent?.id).toEqual(expect.any(String))
    expect(otherCreated.structuredContent?.id).not.toBe(result.id)
    const unauthorized = await worker.dispatchFetch(origin + '/api/resumes/' + draft.id, {
      headers: { cookie: other.cookie },
    })
    expect(unauthorized.status).toBe(404)
    const removed = await worker.dispatchFetch(origin + '/api/resumes/' + result.id, {
      method: 'DELETE',
      headers: { origin, cookie },
    })
    expect(removed.status).toBe(200)
    expect((await create(writeGrant.access_token, input)).structuredContent).toEqual(result)
    expect(await (await list()).json()).toMatchObject({ data: [{ id: draft.id }] })
  } finally {
    await worker.dispose()
  }
})

async function callResumeTool(worker: Miniflare, token: string, name: string, args: object) {
  const response = await worker.dispatchFetch(mcpResource, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  })
  expect(response.status).toBe(200)
  return (
    (await response.json()) as {
      result: {
        isError?: boolean
        content: { text: string }[]
        structuredContent?: { id: string; version: number; editorUrl?: string; data?: ResumeData }
      }
    }
  ).result
}

test('MCP manages resume metadata and can copy and delete only authorized revisions', async () => {
  const { runtime: worker, setGoogleProfile } = await createTestRuntime({
    origin,
    bindings: chatgptClient,
  })
  try {
    const { cookie } = await login(worker)
    const originalGrant = mcpAuthorization(worker, 'resumes:read_full resumes:write resumes:edit')
    const originalToken = (
      await originalGrant.connect(cookie, await originalGrant.authorize(cookie))
    ).access_token
    const call = (name: string, args: object, token = originalToken) =>
      callResumeTool(worker, token, name, args)
    const created = (
      await call('create_resume', {
        title: 'Original',
        description: 'Frontend roles',
        requestKey: 'management-original',
        data: { basics: { name: 'Test Candidate' }, design: { template: 'meowth' } },
      })
    ).structuredContent!
    expect(created).toMatchObject({ id: expect.any(String), version: expect.any(Number) })
    const read = async (resumeId: string) =>
      (await call('read_resume', { resumeId })).structuredContent!
    const original = await read(created.id)
    expect(original).toMatchObject({
      title: 'Original',
      description: 'Frontend roles',
      visibility: 'private',
    })
    const target = { resumeId: original.id, version: original.version }
    const changes = { title: 'Renamed', description: 'Updated roles', visibility: 'public' }
    expect(await call('update_resume_metadata', { ...target, changes })).toMatchObject({
      isError: true,
      _meta: { 'mcp/www_authenticate': [expect.stringContaining('scope="resumes:manage"')] },
    })
    const grant = mcpAuthorization(worker, 'resumes:manage')
    const token = (await grant.connect(cookie, await grant.authorize(cookie))).access_token
    const manage = (name: string, args: object) => call(name, args, token)
    expect(await manage('update_resume_metadata', { ...target, changes })).toMatchObject({
      structuredContent: changes,
    })
    const renamed = await read(original.id)
    expect(renamed).toMatchObject({ ...changes, data: original.data })
    const photo = `data:image/jpeg;base64,${sampleJpeg}`
    const photoPath = origin + '/api/resumes/' + original.id + '/avatar'
    const photoHeaders = { origin, cookie, 'content-type': 'application/json' }
    const upload = await worker.dispatchFetch(photoPath, {
      method: 'PUT',
      headers: photoHeaders,
      body: JSON.stringify({ jpeg: sampleJpeg }),
    })
    expect(upload.status).toBe(200)
    expect(await read(original.id)).not.toHaveProperty('avatar')
    expect(renamed.version).toBeGreaterThan(original.version)
    expect(await manage('delete_resume', target)).toMatchObject({
      isError: true,
      content: [{ text: expect.stringContaining('version conflict') }],
    })
    expect(
      await manage('update_resume_metadata', { ...target, changes: { title: 'Stale' } }),
    ).toMatchObject({ isError: true })
    expect(await read(original.id)).toEqual(renamed)

    const duplicate = {
      resumeId: original.id,
      version: renamed.version,
      title: 'New copy',
      requestKey: 'management-copy',
    }
    expect(
      await manage('duplicate_resume', { ...duplicate, version: original.version }),
    ).toMatchObject({
      isError: true,
      content: [{ text: expect.stringContaining('version conflict') }],
    })
    const copies = await Promise.all([
      manage('duplicate_resume', duplicate),
      manage('duplicate_resume', duplicate),
    ])
    const copy = copies[0].structuredContent!
    expect(copy).toMatchObject({ id: expect.any(String), title: 'New copy' })
    expect(copy.id).not.toBe(original.id)
    expect(copies[1].structuredContent).toEqual(copy)
    expect(await read(copy.id)).toMatchObject({
      title: 'New copy',
      visibility: 'private',
      description: 'Updated roles',
      data: original.data,
    })
    const readCopyPhoto = async () => {
      const result = await worker.dispatchFetch(origin + '/api/resumes/' + copy.id, {
        headers: { cookie },
      })
      return result.json()
    }
    expect(await readCopyPhoto()).toMatchObject({ data: { avatar: photo } })
    expect(
      (await worker.dispatchFetch(photoPath, { method: 'DELETE', headers: photoHeaders })).status,
    ).toBe(200)
    expect(await readCopyPhoto()).toMatchObject({ data: { avatar: photo } })
    expect(
      await manage('duplicate_resume', { ...duplicate, title: 'Different copy' }),
    ).toMatchObject({ isError: true })

    setGoogleProfile({
      sub: 'management-other',
      email: 'management-other@example.test',
      email_verified: true,
      name: 'Other',
    })
    const other = await login(worker)
    const otherToken = (await grant.connect(other.cookie, await grant.authorize(other.cookie)))
      .access_token
    for (const [name, input] of [
      ['duplicate_resume', duplicate],
      ['delete_resume', { ...target, version: renamed.version }],
      ['update_resume_metadata', { ...target, version: renamed.version, changes }],
    ] as const) {
      expect(await call(name, input, otherToken)).toMatchObject({
        isError: true,
        content: [{ text: 'Resume not found.' }],
      })
    }
    expect(await manage('delete_resume', { ...target, version: renamed.version })).toMatchObject({
      structuredContent: { id: original.id },
    })
    expect((await call('read_resume', { resumeId: original.id })).isError).toBe(true)
    expect((await manage('duplicate_resume', duplicate)).structuredContent).toEqual(copy)
    const list = await worker.dispatchFetch(origin + '/api/resumes', { headers: { cookie } })
    expect(((await list.json()) as { data: { id: string }[] }).data.map(({ id }) => id)).toEqual([
      copy.id,
    ])
  } finally {
    await worker.dispose()
  }
})

test('ChatGPT creates a complete private resume that can be reopened and safely retried', async () => {
  const { runtime: worker } = await createTestRuntime({ origin, bindings: chatgptClient })
  try {
    const { cookie } = await login(worker)
    const oauth = mcpAuthorization(worker, 'resumes:read_full resumes:write')
    const { access_token: token } = await oauth.connect(cookie, await oauth.authorize(cookie))
    const call = (name: string, args: object) => callResumeTool(worker, token, name, args)
    const input = {
      title: 'Complete draft',
      requestKey: 'complete-draft',
      data: {
        basics: {
          name: 'Test Author',
          picture: { url: 'https://example.test/avatar.png' },
          customFields: [{ label: 'Portfolio', link: 'https://example.test/work' }],
        },
        modules: {
          languages: { items: [{ language: 'Swedish' }] },
          'custom-selected-work': {
            name: 'Selected work',
            type: 'projects',
            startOnNewPage: true,
            items: [
              {
                name: 'Browser prototype',
                visible: false,
                website: { link: 'https://example.test/demo' },
              },
            ],
          },
          'custom-notes': { name: 'Notes', items: [{ name: 'Other work', summary: 'Details' }] },
        },
        sectionOrder: ['languages', 'custom-selected-work', 'custom-notes'],
        design: { template: 'meowth', density: 'roomy', themeColor: '#102030' },
        typography: { preset: 'balanced', textSize: 11 },
      },
    }
    const result = await call('create_resume', input)
    expect(result).toMatchObject({
      structuredContent: { id: expect.any(String), version: expect.any(Number) },
    })
    const { id, version } = result.structuredContent!
    expect((await call('create_resume', input)).structuredContent).toEqual(result.structuredContent)
    const browser = await worker.dispatchFetch(origin + '/api/resumes/' + id, {
      headers: { cookie },
    })
    const reopened = ((await browser.json()) as { data: { visibility: string; data: ResumeData } })
      .data
    expect(reopened).toMatchObject({
      visibility: 'private',
      data: {
        basics: {
          name: 'Test Author',
          email: '',
          picture: { url: input.data.basics.picture.url, size: 64 },
          customFields: input.data.basics.customFields,
        },
        modules: {
          ...defaultResumeData.modules,
          languages: {
            name: 'Languages',
            items: [{ id: expect.any(String), language: 'Swedish', fluency: '', rating: 0 }],
          },
          'custom-selected-work': {
            id: 'custom-selected-work',
            name: 'Selected work',
            startOnNewPage: true,
            items: [
              {
                id: expect.any(String),
                name: 'Browser prototype',
                visible: false,
                website: { label: '', link: 'https://example.test/demo' },
              },
            ],
          },
          'custom-notes': {
            id: 'custom-notes',
            items: [{ id: expect.any(String), name: 'Other work', summary: 'Details' }],
          },
        },
        sectionOrder: input.data.sectionOrder,
        design: input.data.design,
        typography: input.data.typography,
      },
    })
    expect((await call('read_resume', { resumeId: id })).structuredContent).toMatchObject({
      id,
      version,
      data: reopened.data,
    })
    const invalid = await call('create_resume', {
      title: 'Invalid draft',
      requestKey: 'invalid-complete-draft',
      data: { modules: { languages: { items: [{ id: 'caller-id', language: 'Swedish' }] } } },
    })
    expect(invalid.isError).toBe(true)
    const list = await worker.dispatchFetch(origin + '/api/resumes', { headers: { cookie } })
    expect(((await list.json()) as { data: { id: string }[] }).data.map(({ id }) => id)).toEqual([
      id,
    ])
  } finally {
    await worker.dispose()
  }
})

test('ChatGPT edits Basics and existing entries in one authorized, versioned batch', async () => {
  const { runtime: worker } = await createTestRuntime({ origin, bindings: chatgptClient })
  try {
    const { cookie } = await login(worker)
    const legacy = mcpAuthorization(worker, 'resumes:read_full resumes:write')
    const { access_token: legacyToken } = await legacy.connect(
      cookie,
      await legacy.authorize(cookie),
    )
    const call = (name: string, args: object, token = legacyToken) =>
      callResumeTool(worker, token, name, args)
    const { id: resumeId, version } = (
      await call('create_resume', {
        title: 'Edit together',
        requestKey: 'edit-together',
        data: {
          basics: {
            name: 'Test Candidate',
            website: { label: 'Portfolio', link: 'https://example.test/old' },
          },
          modules: { projects: { items: [{ name: 'Prototype', visible: false }] } },
        },
      })
    ).structuredContent!
    const read = async () => (await call('read_resume', { resumeId })).structuredContent!
    const original = await read()
    const entry = original.data!.modules.projects.items[0]
    const edit = {
      resumeId,
      version,
      operations: [
        {
          op: 'update_basics',
          changes: {
            email: 'candidate@example.test',
            website: { link: 'https://example.test/new' },
          },
        },
        {
          op: 'update_entry',
          sectionId: 'projects',
          entryId: entry.id,
          changes: { summary: 'Updated project.' },
        },
        { op: 'update_summary', text: 'Software developer.' },
      ],
    }
    expect(await call('apply_resume_patch', edit)).toMatchObject({
      isError: true,
      _meta: { 'mcp/www_authenticate': [expect.stringContaining('scope="resumes:edit"')] },
    })
    const oauth = mcpAuthorization(worker, 'resumes:edit')
    const { access_token: token } = await oauth.connect(cookie, await oauth.authorize(cookie))
    const apply = (args: object) => call('apply_resume_patch', args, token)
    for (const rejected of [
      { ...edit, operations: [edit.operations[0], { ...edit.operations[1], entryId: 'missing' }] },
      {
        ...edit,
        operations: [
          edit.operations[0],
          { ...edit.operations[1], changes: { university: 'Wrong entry type' } },
        ],
      },
    ]) {
      expect((await apply(rejected)).isError).toBe(true)
      expect(await read()).toEqual(original)
    }
    const result = await apply(edit)
    expect(result.structuredContent).toMatchObject({ id: resumeId, version: expect.any(Number) })
    const saved = await read()
    expect(saved.version).toBeGreaterThan(version)
    expect(saved.data!.basics).toEqual({
      ...original.data!.basics,
      email: 'candidate@example.test',
      website: { ...original.data!.basics.website, link: 'https://example.test/new' },
    })
    expect(saved.data!.modules).toMatchObject({
      ...original.data!.modules,
      projects: {
        ...original.data!.modules.projects,
        items: [{ ...entry, summary: 'Updated project.' }],
      },
      summary: { content: 'Software developer.' },
    })
    expect(await apply(edit)).toMatchObject({
      isError: true,
      content: [{ text: expect.stringContaining('version conflict') }],
    })
    expect(await read()).toEqual(saved)
    expect(
      await apply({ ...edit, resumeId: '2d680e50-efaa-419b-b138-d30cab4a603e' }),
    ).toMatchObject({
      isError: true,
      content: [{ text: 'Resume not found.' }],
    })
  } finally {
    await worker.dispose()
  }
})

test('ChatGPT reorganizes resume sections and entries and saves design with the same patch', async () => {
  const { runtime: worker } = await createTestRuntime({ origin, bindings: chatgptClient })
  try {
    const { cookie } = await login(worker)
    const oauth = mcpAuthorization(worker, 'resumes:read_full resumes:write resumes:edit')
    const { access_token: token } = await oauth.connect(cookie, await oauth.authorize(cookie))
    const call = (name: string, args: object) => callResumeTool(worker, token, name, args)
    const { id: resumeId, version } = (
      await call('create_resume', {
        title: 'Organize and style',
        requestKey: 'organize-and-style',
        data: {
          modules: {
            skills: { items: [{ name: 'TypeScript' }, { name: 'SQL' }, { name: 'Old skill' }] },
            'custom-old': { name: 'Old section' },
          },
          sectionOrder: ['custom-old', 'skills'],
          design: { density: 'compact' },
        },
      })
    ).structuredContent!
    const read = async () => (await call('read_resume', { resumeId })).structuredContent!
    const original = await read()
    const [typescript, sql, obsolete] = original.data!.modules.skills.items
    const order = ['custom-languages', 'skills', 'education', 'experience', 'projects']
    const operations = [
      { op: 'remove_entry', sectionId: 'skills', entryId: obsolete.id },
      { op: 'reorder_entries', sectionId: 'skills', entryIds: [sql.id, typescript.id] },
      { op: 'add_entry', sectionId: 'skills', beforeEntryId: sql.id, entry: { name: 'Rust' } },
      { op: 'update_entry', sectionId: 'skills', entryId: sql.id, changes: { visible: false } },
      { op: 'remove_section', sectionId: 'custom-old' },
      {
        op: 'add_section',
        sectionId: 'custom-languages',
        section: { name: 'Other languages', type: 'languages', items: [{ language: 'French' }] },
      },
      { op: 'reorder_sections', sectionIds: order },
      {
        op: 'update_section',
        sectionId: 'custom-languages',
        changes: { visible: true, startOnNewPage: true, keepTogether: true },
      },
      {
        op: 'update_design',
        design: { template: 'meowth', themeColor: '#202830' },
        typography: { preset: 'clean', textSize: 11.5 },
      },
    ]
    const patch = (ops: object[], expectedVersion = version) =>
      call('apply_resume_patch', { resumeId, version: expectedVersion, operations: ops })
    expect(
      (
        await patch([
          operations[0],
          { op: 'reorder_entries', sectionId: 'skills', entryIds: [sql.id, sql.id] },
        ])
      ).isError,
    ).toBe(true)
    expect(await read()).toEqual(original)
    expect(await patch(operations)).toMatchObject({ structuredContent: { id: resumeId } })
    const browser = await worker.dispatchFetch(origin + '/api/resumes/' + resumeId, {
      headers: { cookie },
    })
    const saved = ((await browser.json()) as { data: { data: ResumeData } }).data.data
    expect(saved).toMatchObject({
      modules: {
        skills: {
          items: [
            { id: expect.any(String), name: 'Rust', level: 'Beginner' },
            { ...sql, visible: false },
            typescript,
          ],
        },
        'custom-languages': {
          visible: true,
          startOnNewPage: true,
          keepTogether: true,
          items: [{ id: expect.any(String), language: 'French' }],
        },
      },
      sectionOrder: order,
      design: { density: 'compact', template: 'meowth', themeColor: '#202830' },
      typography: { preset: 'clean', textSize: 11.5 },
    })
    expect(saved.modules).not.toHaveProperty('custom-old')
    const current = await read()
    expect(current.data).toEqual(saved)
    const reset = await patch(
      [
        { op: 'clear_section', sectionId: 'skills' },
        { op: 'update_design', design: null, typography: null },
      ],
      current.version,
    )
    expect(reset.structuredContent?.id).toBe(resumeId)
    const cleared = (await read()).data!
    expect(cleared.modules.skills.items).toEqual([])
    expect(cleared.design).toBeUndefined()
    expect(cleared.typography).toBeUndefined()
  } finally {
    await worker.dispose()
  }
})

test('MCP and browser edits share an owner-scoped version and reject competing saves', async () => {
  const fixture = await createTestRuntime({ origin, bindings: chatgptClient })
  const worker = fixture.runtime
  try {
    const { cookie } = await login(worker)
    const oauth = mcpAuthorization(worker, 'resumes:read resumes:write')
    const { access_token: accessToken } = await oauth.connect(cookie, await oauth.authorize(cookie))
    const headers = { origin, cookie, 'content-type': 'application/json' }
    const data: ResumeData = structuredClone(defaultResumeData)
    data.basics.email = 'private@example.test'
    data.design = { template: 'meowth' }
    data.modules.experience.items = [
      { ...defaultExperience, id: 'work-one', company: 'Keep company', summary: 'Old work text' },
    ]
    data.modules.projects.items = [
      {
        ...defaultProjects,
        id: 'project-one',
        description: 'Old description',
        summary: 'Keep summary',
      },
      { ...defaultProjects, id: 'project-two', description: 'Keep other project' },
    ]
    const created = await worker.dispatchFetch(origin + '/api/resumes', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Versioned resume', data, visibility: 'public' }),
    })
    expect(created.status).toBe(201)
    const { data: original } = (await created.json()) as { data: { id: string; updatedAt: string } }
    const url = origin + '/api/resumes/' + original.id
    const update = async (args: object, token = accessToken) => {
      const response = await worker.dispatchFetch(mcpResource, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'update_resume', arguments: args },
        }),
      })
      expect(response.status).toBe(200)
      return (
        (await response.json()) as {
          result: {
            isError?: boolean
            content: { text: string }[]
            structuredContent?: { id: string; version: number; editorUrl: string }
          }
        }
      ).result
    }
    const first = {
      resumeId: original.id,
      version: Date.parse(original.updatedAt),
      target: { section: 'projects', entryId: 'project-one', field: 'description' },
      text: 'New **description**',
    }
    const edited = await update(first)
    expect(edited.structuredContent).toEqual({
      id: original.id,
      version: expect.any(Number),
      editorUrl: origin + '/builder/' + original.id,
    })
    const version = edited.structuredContent!.version
    expect(version).toBeGreaterThan(first.version)
    const patch = (payload: object) =>
      worker.dispatchFetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      })
    const staleBrowser = await patch({ expectedVersion: first.version, data })
    expect(staleBrowser.status).toBe(409)
    const saved = await worker.dispatchFetch(url, { headers })
    expect(await saved.json()).toMatchObject({
      data: {
        visibility: 'public',
        data: {
          ...data,
          modules: {
            ...data.modules,
            projects: {
              ...data.modules.projects,
              items: [
                { ...data.modules.projects.items[0], description: first.text },
                data.modules.projects.items[1],
              ],
            },
          },
        },
      },
    })
    const browser = await patch({ expectedVersion: version, title: 'Browser updated' })
    expect(browser.status).toBe(200)
    const { data: browserSaved } = (await browser.json()) as { data: { updatedAt: string } }
    const browserVersion = Date.parse(browserSaved.updatedAt)
    expect(browserVersion).toBeGreaterThan(version)
    const conflict = await update({ ...first, version })
    expect(conflict).toMatchObject({
      isError: true,
      content: [{ text: expect.stringContaining('version conflict') }],
    })
    const competing = await Promise.all([
      update({
        ...first,
        version: browserVersion,
        target: { section: 'summary' },
        text: 'Draft A',
      }),
      update({
        ...first,
        version: browserVersion,
        target: { section: 'summary' },
        text: 'Draft B',
      }),
    ])
    expect(competing.filter((result) => result.isError)).toHaveLength(1)
    expect(competing.filter((result) => result.structuredContent)).toHaveLength(1)
    const winningVersion = competing.find((result) => result.structuredContent)!.structuredContent!
      .version
    const latest = await worker.dispatchFetch(url, { headers })
    expect(await latest.json()).toMatchObject({
      data: {
        title: 'Browser updated',
        data: {
          modules: { summary: { id: 'summary', content: expect.stringMatching(/^Draft [AB]$/) } },
        },
      },
    })

    const madePrivate = await patch({ expectedVersion: winningVersion, visibility: 'private' })
    expect(madePrivate.status).toBe(200)
    const { data: privateResume } = (await madePrivate.json()) as { data: { updatedAt: string } }
    const privateVersion = Date.parse(privateResume.updatedAt)
    const workEdit = {
      ...first,
      version: privateVersion,
      target: { section: 'experience', entryId: 'work-one' },
      text: 'New work description',
    }
    const work = await update(workEdit)
    expect(work.structuredContent?.version).toBeGreaterThan(privateVersion)
    const workVersion = work.structuredContent!.version
    const projectSummary = {
      ...first,
      version: workVersion,
      target: { section: 'projects', entryId: 'project-one', field: 'summary' },
      text: 'New project summary',
    }
    const invalid = await update({
      ...projectSummary,
      target: { ...projectSummary.target, field: 'name' },
    })
    expect(invalid.isError).toBe(true)
    const missing = await update({
      ...workEdit,
      version: workVersion,
      target: { section: 'experience', entryId: 'missing' },
    })
    expect(missing).toMatchObject({
      isError: true,
      content: [{ text: 'Resume or entry not found.' }],
    })
    const project = await update(projectSummary)
    expect(project.structuredContent?.version).toBeGreaterThan(workVersion)

    fixture.setGoogleProfile({
      sub: 'edit-other-account',
      email: 'edit-other@example.test',
      email_verified: true,
      name: 'Other',
    })
    const other = await login(worker)
    const readOnly = mcpAuthorization(worker, 'resumes:read')
    const readGrant = await readOnly.connect(other.cookie, await readOnly.authorize(other.cookie))
    const currentEdit = { ...projectSummary, version: project.structuredContent!.version }
    const denied = await update(currentEdit, readGrant.access_token)
    expect(denied).toMatchObject({
      isError: true,
      content: [{ text: 'This tool needs additional permission.' }],
    })
    const otherGrant = await oauth.connect(other.cookie, await oauth.authorize(other.cookie))
    expect(await update(currentEdit, otherGrant.access_token)).toEqual(missing)

    const final = await worker.dispatchFetch(url, { headers })
    expect(await final.json()).toMatchObject({
      data: {
        updatedAt: new Date(currentEdit.version).toISOString(),
        visibility: 'private',
        data: {
          modules: {
            experience: {
              items: [{ id: 'work-one', company: 'Keep company', summary: workEdit.text }],
            },
            projects: {
              items: [
                { id: 'project-one', description: first.text, summary: projectSummary.text },
                { id: 'project-two', description: 'Keep other project' },
              ],
            },
          },
        },
      },
    })
  } finally {
    await worker.dispose()
  }
})

test('only a resume owner can replace or remove a bounded avatar', async () => {
  fixture.setGoogleProfile({
    sub: 'avatar-owner',
    name: 'Avatar Owner',
    email: 'avatar-owner@example.test',
    email_verified: true,
  })
  const owner = await login()
  const headers = { origin, cookie: owner.cookie, 'content-type': 'application/json' }
  const created = await runtime.dispatchFetch(origin + '/api/resumes', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Avatar resume' }),
  })
  expect(created.status).toBe(201)
  const { data } = (await created.json()) as { data: { id: string } }
  const path = origin + '/api/resumes/' + data.id
  const put = (jpeg: string, cookie = owner.cookie) =>
    runtime.dispatchFetch(path + '/avatar', {
      method: 'PUT',
      headers: { ...headers, cookie },
      body: JSON.stringify({ jpeg }),
    })
  expect((await put('bm90IGEganBlZw==')).status).toBe(400)
  expect((await put(sampleJpeg)).status).toBe(200)
  expect(await (await runtime.dispatchFetch(path, { headers })).json()).toMatchObject({
    data: { avatar: `data:image/jpeg;base64,${sampleJpeg}` },
  })
  fixture.setGoogleProfile({
    sub: 'avatar-other',
    name: 'Other',
    email: 'avatar-other@example.test',
    email_verified: true,
  })
  const other = await login()
  expect((await runtime.dispatchFetch(path, { headers: { cookie: other.cookie } })).status).toBe(
    404,
  )
  expect((await put(sampleJpeg, other.cookie)).status).toBe(404)
  expect(
    (
      await runtime.dispatchFetch(path + '/avatar', {
        method: 'DELETE',
        headers: { ...headers, cookie: other.cookie },
      })
    ).status,
  ).toBe(404)
  const replacement = Buffer.concat([
    Buffer.from([255, 216, 255, 254, 0, 3, 65]),
    Buffer.from(sampleJpeg, 'base64').subarray(2),
  ]).toString('base64')
  expect((await put(replacement)).status).toBe(200)
  expect(await (await runtime.dispatchFetch(path, { headers })).json()).toMatchObject({
    data: { avatar: `data:image/jpeg;base64,${replacement}` },
  })
  expect(
    (await runtime.dispatchFetch(path + '/avatar', { method: 'DELETE', headers })).status,
  ).toBe(200)
  expect(await (await runtime.dispatchFetch(path, { headers })).json()).toMatchObject({
    data: { avatar: null },
  })
})
