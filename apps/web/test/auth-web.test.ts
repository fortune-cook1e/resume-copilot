// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import postgres from 'postgres';

vi.mock('next/headers', () => ({ headers: async () => new Headers({ cookie: 'test-session=owner' }) }));

describe('authenticated resume access', () => {
  let sql: ReturnType<typeof postgres>;
  let getResume: typeof import('../app/api/resumes/[id]/route').GET;
  let patchResume: typeof import('../app/api/resumes/[id]/route').PATCH;
  let listResumes: typeof import('../app/api/resumes/route').GET;
  let createResume: typeof import('../app/api/resumes/route').POST;
  const ownerId = 'web-auth-test-owner';
  const otherId = 'web-auth-test-other';
  const resumeId = 'web-auth-test-foreign-resume';

  beforeAll(async () => {
    const testURL = process.env.AUTH_TEST_DATABASE_URL;
    if (!testURL || new URL(testURL).pathname !== '/resume_copilot_test') throw new Error('Web auth tests require isolated resume_copilot_test');
    process.env.DATABASE_URL = testURL;
    sql = postgres(testURL);
    const [target] = await sql`SELECT current_database() AS name`;
    if (target.name !== 'resume_copilot_test') throw new Error('Refusing to mutate a non-test database');
    await sql`INSERT INTO "user" (id, name, email) VALUES (${ownerId}, 'Owner', 'web-owner@example.test'), (${otherId}, 'Other', 'web-other@example.test')`;
    await sql`INSERT INTO "resume" (id, user_id, title, data) VALUES (${resumeId}, ${otherId}, 'Private resume', ${sql.json({})})`;
    ({ GET: getResume, PATCH: patchResume } = await import('../app/api/resumes/[id]/route'));
    ({ GET: listResumes, POST: createResume } = await import('../app/api/resumes/route'));
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', async () => Response.json({ data: { id: ownerId, name: 'Owner', email: 'web-owner@example.test' }, error: null }));
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    if (sql) {
      await sql`DELETE FROM "user" WHERE id IN (${ownerId}, ${otherId})`;
      await sql.end();
    }
  });

  it('returns an empty authenticated resume list in the shared business response format', async () => {
    const response = await listResumes();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [], error: null });
  });

  it('keeps manual blank-resume creation available without document parsing', async () => {
    const response = await createResume(new NextRequest('http://localhost:3000/api/resumes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
      body: JSON.stringify({ title: 'Manual resume' }),
    }));
    expect(response.status).toBe(201);
    const body = await response.json() as { data: { title: string; userId: string; data: unknown }; error: null };
    expect(body).toMatchObject({ data: { title: 'Manual resume', userId: ownerId, data: expect.any(Object) }, error: null });
  });

  it('does not reveal another user’s resume by its ID', async () => {
    const response = await getResume(new NextRequest(`http://localhost:3000/api/resumes/${resumeId}`), {
      params: Promise.resolve({ id: resumeId }),
    });
    expect(response.status).toBe(404);
  });

  it('does not let another user change a resume by its ID', async () => {
    const response = await patchResume(new NextRequest(`http://localhost:3000/api/resumes/${resumeId}`, {
      method: 'PATCH', body: JSON.stringify({ title: 'Stolen' }), headers: { 'content-type': 'application/json' },
    }), { params: Promise.resolve({ id: resumeId }) });
    expect(response.status).toBe(404);
    vi.stubGlobal('fetch', async () => Response.json({ data: { id: otherId, name: 'Other', email: 'web-other@example.test' }, error: null }));
    const ownerResponse = await getResume(new NextRequest(`http://localhost:3000/api/resumes/${resumeId}`), {
      params: Promise.resolve({ id: resumeId }),
    });
    expect((await ownerResponse.json() as { data: { title: string } }).data.title).toBe('Private resume');
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

  it('fails closed as unavailable rather than treating an auth outage as sign-out', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('internal network failure'); });
    const response = await getResume(new NextRequest(`http://localhost:3000/api/resumes/${resumeId}`), {
      params: Promise.resolve({ id: resumeId }),
    });
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('internal network failure');
  });
});
