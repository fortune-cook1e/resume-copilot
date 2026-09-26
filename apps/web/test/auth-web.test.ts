// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({ headers: async () => new Headers({ cookie: 'test-session=owner' }) }));

describe('authenticated resume access', () => {
  const ownerId = 'web-auth-test-owner';

  beforeEach(() => {
    vi.stubGlobal('fetch', async () => Response.json({ data: { id: ownerId, name: 'Owner', email: 'web-owner@example.test' }, error: null }));
  });

  it('routes resume CRUD to Nest while retaining Web PDF and polish routes', async () => {
    const { default: config } = await import('../next.config');
    const rewrites = await config.rewrites?.();
    expect(rewrites).toHaveProperty('beforeFiles');
    if (!rewrites || !('beforeFiles' in rewrites)) throw new Error('Missing beforeFiles rewrites');
    expect(rewrites.beforeFiles).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: '/api/resumes', destination: expect.stringMatching(/\/api\/resumes$/) }),
      expect.objectContaining({ source: '/api/resumes/:path*', destination: expect.stringMatching(/\/api\/resumes\/:path\*$/) }),
    ]));
    expect(rewrites.beforeFiles?.some(route => route.source === '/api/export-pdf' || route.source === '/api/ai-polish')).toBe(false);
    const { defaultResumeData: apiDefault } = await import('@resume-copilot/contracts');
    const { defaultResumeData: webDefault } = await import('../types/resume/resume');
    expect(apiDefault).toEqual(webDefault);
  });

  it('rejects cross-origin writes to new Web business APIs by default', async () => {
    const { proxy } = await import('../proxy');
    const response = await proxy(new NextRequest('http://localhost:3000/api/new-business-route', {
      method: 'POST', headers: { cookie: 'test-session=owner', origin: 'https://untrusted.invalid' },
    }));
    expect(response.status).toBe(403);
  });

  it('leaves Nest auth writes to Nest and permits same-origin Web writes', async () => {
    const { proxy } = await import('../proxy');
    const authResponse = await proxy(new NextRequest('http://localhost:3000/api/auth/sign-in/social', {
      method: 'POST', headers: { origin: 'https://untrusted.invalid' },
    }));
    expect(authResponse.status).toBe(200);
    const webResponse = await proxy(new NextRequest('http://localhost:3000/api/new-business-route', {
      method: 'POST', headers: { origin: 'http://localhost:3000' },
    }));
    expect(webResponse.status).toBe(200);
  });

  it('redirects a rejected session before rendering the dashboard', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 }));
    const { default: DashboardLayout } = await import('../app/dashboard/layout');
    await expect(DashboardLayout({ children: 'protected content' })).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT;replace;/login;'),
    });
  });

  it('does not redirect or render protected dashboard content when auth is unavailable', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('internal network failure'); });
    const { default: DashboardLayout } = await import('../app/dashboard/layout');
    const view = await DashboardLayout({ children: 'protected content' });
    expect(view.props.role).toBe('alert');
    expect(JSON.stringify(view)).not.toContain('protected content');
  });

  it('requires a session for the editor independently of the public print page', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 401 }));
    const { default: ResumePage } = await import('../app/resume/page');
    await expect(ResumePage()).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT;replace;/login;'),
    });
  });

});
