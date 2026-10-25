import { createRequire } from 'node:module'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import postgres from 'postgres'
import { currentUserSchema, httpResponseSchema } from '@resume-copilot/contracts'

const require = createRequire(import.meta.url)
const { createApplication } = require('../../dist/main.js') as typeof import('../../dist/main.js')
const { ApplicationState } =
  require('../../dist/lifecycle/application-state.js') as typeof import('../../dist/lifecycle/application-state.js')

describe('trusted identity over HTTP', () => {
  let app: INestApplication
  let baseURL: string
  let testDb: ReturnType<typeof postgres>

  beforeAll(async () => {
    testDb = postgres(process.env.DATABASE_URL!)
    const [target] = await testDb`SELECT current_database() AS name`
    if (target.name !== 'resume_copilot_test')
      throw new Error('Refusing to mutate a non-test database')
    await testDb`TRUNCATE TABLE "user", "verification" CASCADE`
    process.env.BODY_LIMIT_BYTES = '128'
    app = await createApplication()
    await app.listen(0, '127.0.0.1')
    baseURL = await app.getUrl()
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    await app?.close()
    await testDb?.end()
  })

  async function signInWithGoogle(
    providerId: string,
    verified = true,
    email = 'person@example.test',
    picture?: string,
  ) {
    const start = await fetch(`${baseURL}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
      body: JSON.stringify({ provider: 'google', callbackURL: '/dashboard/resumes' }),
    })
    expect(start.status).toBe(200)
    const { url } = (await start.json()) as { url: string }
    const state = new URL(url).searchParams.get('state')
    expect(state).toBeTruthy()
    const stateCookies = start.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const idToken = [
      Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
      Buffer.from(
        JSON.stringify({
          sub: providerId,
          email,
          email_verified: verified,
          name: 'Test Person',
          ...(picture ? { picture } : {}),
        }),
      ).toString('base64url'),
      'test-signature',
    ].join('.')
    const nativeFetch = globalThis.fetch
    vi.stubGlobal('fetch', (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (String(input) === 'https://oauth2.googleapis.com/token') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              access_token: 'test-access-token',
              token_type: 'Bearer',
              expires_in: 3600,
              id_token: idToken,
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        )
      }
      return nativeFetch(input, init)
    })
    try {
      return await fetch(
        `${baseURL}/api/auth/callback/google?state=${encodeURIComponent(state!)}&code=controlled-code`,
        {
          redirect: 'manual',
          headers: { cookie: stateCookies },
        },
      )
    } finally {
      vi.unstubAllGlobals()
    }
  }

  it('signs in a verified Google identity and protects its minimal user profile', async () => {
    const callback = await signInWithGoogle('google-account-1')
    expect(callback.status).toBe(302)
    const cookie = callback.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const nativeSession = await fetch(`${baseURL}/api/auth/get-session`, { headers: { cookie } })
    expect(nativeSession.status).toBe(200)
    expect(nativeSession.headers.get('cache-control')).toBe('no-store')
    const response = await fetch(`${baseURL}/api/me`, { headers: { cookie } })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = (await response.json()) as {
      data: { id: string; email: string; name: string }
      error: null
    }
    expect(body).toEqual({
      data: { id: expect.any(String), email: 'person@example.test', name: 'Test Person' },
      error: null,
    })
    expect(httpResponseSchema(currentUserSchema).parse(body)).toEqual(body)
    const returning = await signInWithGoogle('google-account-1')
    expect(returning.status).toBe(302)
    const nextCookie = returning.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const nextResponse = await fetch(`${baseURL}/api/me`, { headers: { cookie: nextCookie } })
    expect(((await nextResponse.json()) as typeof body).data.id).toBe(body.data.id)
  })

  it('creates a session when a verified Google profile includes a picture', async () => {
    const callback = await signInWithGoogle(
      'google-account-with-picture',
      true,
      'picture@example.test',
      'https://images.example.test/profile.png',
    )
    expect(callback.status).toBe(302)
    const cookie = callback.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const response = await fetch(`${baseURL}/api/me`, { headers: { cookie } })
    expect(response.status).toBe(200)
    expect(((await response.json()) as { data: { email: string } }).data.email).toBe(
      'picture@example.test',
    )
  })

  it('does not link a different Google account merely because its email matches', async () => {
    const callback = await signInWithGoogle('unrelated-google-account')
    const cookie = callback.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const response = await fetch(`${baseURL}/api/me`, { headers: { cookie } })
    expect(response.status).toBe(401)
  })

  it('uses the configured public callback despite untrusted forwarding headers', async () => {
    const response = await fetch(`${baseURL}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'untrusted.invalid',
      },
      body: JSON.stringify({ provider: 'google', callbackURL: '/dashboard/resumes' }),
    })
    expect(response.status).toBe(200)
    const { url } = (await response.json()) as { url: string }
    expect(new URL(url).searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/auth/callback/google',
    )
  })

  it('rejects an untrusted browser origin before starting the Google flow', async () => {
    const response = await fetch(`${baseURL}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://untrusted.invalid' },
      body: JSON.stringify({ provider: 'google', callbackURL: '/dashboard/resumes' }),
    })
    expect(response.status).toBe(403)
    expect(response.headers.getSetCookie().some((value) => value.includes('oauth_state'))).toBe(
      false,
    )
  })

  it('rejects oversized auth bodies even without Content-Length', async () => {
    const body = JSON.stringify({
      provider: 'google',
      callbackURL: '/dashboard/resumes',
      padding: 'x'.repeat(200),
    })
    const normal = await fetch(`${baseURL}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
      body,
    })
    expect(normal.status).toBe(413)
    const chunked = await fetch(`${baseURL}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(body))
          controller.close()
        },
      }),
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })
    expect(chunked.status).toBe(413)
    expect(chunked.headers.getSetCookie().some((value) => value.includes('oauth_state'))).toBe(
      false,
    )
  })

  it('rejects a first Google sign-in with an unverified email', async () => {
    const callback = await signInWithGoogle(
      'different-unverified-account',
      false,
      'unverified@example.test',
    )
    const cookie = callback.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const response = await fetch(`${baseURL}/api/me`, { headers: { cookie } })
    expect(response.status).toBe(401)
  })

  it('does not create a session for an invalid OAuth callback state', async () => {
    const callback = await fetch(
      `${baseURL}/api/auth/callback/google?state=invalid-state&code=controlled-code`,
      { redirect: 'manual' },
    )
    const cookie = callback.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    expect(cookie).not.toContain('session_token=')
    const response = await fetch(`${baseURL}/api/me`, { headers: { cookie } })
    expect(response.status).toBe(401)
  })

  it('does not expose password sign-in or registration endpoints', async () => {
    for (const path of ['sign-in/email', 'sign-up/email']) {
      const response = await fetch(`${baseURL}/api/auth/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({
          name: 'Test Person',
          email: 'person@example.test',
          password: 'test-password',
        }),
      })
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({
        message:
          path === 'sign-in/email'
            ? 'Email and password is not enabled'
            : 'Email and password sign up is not enabled',
      })
      expect(response.headers.getSetCookie().some((value) => value.includes('session_token'))).toBe(
        false,
      )
    }
  })

  it('rejects an expired database session even when the browser still sends its cookie', async () => {
    const callback = await signInWithGoogle('google-account-1')
    const cookie = callback.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const beforeExpiry = await fetch(`${baseURL}/api/me`, { headers: { cookie } })
    expect(beforeExpiry.status).toBe(200)
    const { data } = (await beforeExpiry.json()) as { data: { id: string } }
    await testDb`UPDATE session SET expires_at = now() - interval '1 minute' WHERE user_id = ${data.id}`
    const response = await fetch(`${baseURL}/api/me`, { headers: { cookie } })
    expect(response.status).toBe(401)
  })

  it('revokes only the signed-out session, not another session on the same account', async () => {
    const first = await signInWithGoogle('google-sign-out-test', true, 'signout@example.test')
    const second = await signInWithGoogle('google-sign-out-test', true, 'signout@example.test')
    const firstCookie = first.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const secondCookie = second.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    expect((await fetch(`${baseURL}/api/me`, { headers: { cookie: firstCookie } })).status).toBe(
      200,
    )
    expect((await fetch(`${baseURL}/api/me`, { headers: { cookie: secondCookie } })).status).toBe(
      200,
    )

    const signedOut = await fetch(`${baseURL}/api/auth/sign-out`, {
      method: 'POST',
      headers: {
        cookie: firstCookie,
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
      },
      body: '{}',
    })
    expect(signedOut.status).toBe(200)
    expect(signedOut.headers.getSetCookie().some((value) => value.includes('session_token'))).toBe(
      true,
    )
    expect((await fetch(`${baseURL}/api/me`, { headers: { cookie: firstCookie } })).status).toBe(
      401,
    )
    expect((await fetch(`${baseURL}/api/me`, { headers: { cookie: secondCookie } })).status).toBe(
      200,
    )
  })

  it('renews a session after the 24-hour update threshold, but not on the next request', async () => {
    const callback = await signInWithGoogle('google-renewal-test', true, 'renewal@example.test')
    const cookie = callback.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const before = await fetch(`${baseURL}/api/me`, { headers: { cookie } })
    const { data } = (await before.json()) as { data: { id: string } }
    await testDb`UPDATE session SET expires_at = now() + interval '6 days' - interval '1 minute' WHERE user_id = ${data.id}`

    const renewed = await fetch(`${baseURL}/api/auth/get-session`, { headers: { cookie } })
    expect(renewed.status).toBe(200)
    expect(renewed.headers.getSetCookie().some((value) => value.includes('session_token'))).toBe(
      true,
    )
    const [row] = await testDb`SELECT expires_at FROM session WHERE user_id = ${data.id}`
    expect(new Date(row.expires_at).getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000)
    const again = await fetch(`${baseURL}/api/auth/get-session`, { headers: { cookie } })
    expect(again.headers.getSetCookie().some((value) => value.includes('session_token'))).toBe(
      false,
    )
  })

  it('rejects a fabricated session cookie', async () => {
    const response = await fetch(`${baseURL}/api/me`, {
      headers: { cookie: 'better-auth.session_token=forged-session' },
    })
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated access to the protected user endpoint', async () => {
    const response = await fetch(`${baseURL}/api/me`)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    })
  })

  it('does not initiate a new OAuth login after shutdown begins', async () => {
    app.get(ApplicationState).beginShutdown()
    const response = await fetch(`${baseURL}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
      body: JSON.stringify({ provider: 'google', callbackURL: '/dashboard/resumes' }),
    })
    expect(response.status).toBe(503)
  })
})
