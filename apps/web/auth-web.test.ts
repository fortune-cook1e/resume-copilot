// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => ({
    env: { API: { fetch: (...args: Parameters<typeof fetch>) => fetch(...args) } },
  }),
}))

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ cookie: 'test-session=owner' }),
}))

describe('authenticated resume access', () => {
  const ownerId = 'web-auth-test-owner'

  beforeEach(() => {
    vi.stubGlobal('fetch', async () =>
      Response.json({
        data: { id: ownerId, name: 'Owner', email: 'web-owner@example.test' },
        error: null,
      }),
    )
  })

  it('shares the default resume contract with Nest', async () => {
    const { defaultResumeData: apiDefault } = await import('@resume-copilot/contracts')
    const { defaultResumeData: webDefault } = await import('./types/resume')
    expect(apiDefault).toEqual(webDefault)
  })

  it('redirects a rejected session before rendering the dashboard', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 }),
    )
    const { default: DashboardLayout } = await import('./app/dashboard/layout')
    await expect(DashboardLayout({ children: 'protected content' })).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT;replace;/login;'),
    })
  })

  it('does not redirect or render protected dashboard content when auth is unavailable', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('internal network failure')
    })
    const { default: DashboardLayout } = await import('./app/dashboard/layout')
    const view = await DashboardLayout({ children: 'protected content' })
    expect(view.props.role).toBe('alert')
    expect(JSON.stringify(view)).not.toContain('protected content')
  })

  it('requires a session for the editor independently of the public print page', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 401 }))
    const { default: ResumePage } = await import('./app/resume/page')
    await expect(ResumePage()).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT;replace;/login;'),
    })
    const { default: BuilderPage } = await import('./app/builder/[resumeId]/page')
    await expect(
      BuilderPage({ params: Promise.resolve({ resumeId: 'private-resume' }) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT;replace;/login;'),
    })
  })

  it('keeps authenticated legacy editor links working through the new builder route', async () => {
    const { default: ResumePage } = await import('./app/resume/page')
    await expect(
      ResumePage({ searchParams: Promise.resolve({ id: 'resume-one' }) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT;replace;/builder/resume-one;'),
    })
    await expect(ResumePage()).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT;replace;/dashboard/resumes;'),
    })
  })
})
