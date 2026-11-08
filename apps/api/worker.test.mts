import type { Miniflare } from 'miniflare'
import { createTestRuntime } from './worker.fixture.cjs'
import { afterAll, beforeAll, expect, test } from 'vitest'

let runtime: Miniflare
let fixture: Awaited<ReturnType<typeof createTestRuntime>>
const origin = 'https://resume.example.test'
const cookieHeader = (response: { headers: Headers }) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
async function login() {
  const start = await runtime.dispatchFetch(origin + '/api/auth/sign-in/social', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'google', callbackURL: '/dashboard/resumes' }),
  })
  expect(start.status).toBe(200)
  const { url } = (await start.json()) as { url: string }
  expect(new URL(url).searchParams.get('redirect_uri')).toBe(origin + '/api/auth/callback/google')
  const state = new URL(url).searchParams.get('state')!
  const callback = await runtime.dispatchFetch(
    origin + '/api/auth/callback/google?code=controlled-code&state=' + encodeURIComponent(state),
    {
      redirect: 'manual',
      headers: { cookie: cookieHeader(start) },
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
