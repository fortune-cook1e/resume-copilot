import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';

const require = createRequire(import.meta.url);
const { createApplication } = require('../dist/main.js') as typeof import('../dist/main.js');
const publicOrigin = 'http://localhost:3000';
const ownerId = `resume-owner-${randomUUID()}`;
const otherId = `resume-other-${randomUUID()}`;

describe('resume CRUD over authenticated HTTP', () => {
  let app: Awaited<ReturnType<typeof createApplication>>;
  let baseURL: string;
  let db: ReturnType<typeof postgres>;
  let ownerCookie: string;
  let otherCookie: string;
  let verifiedTestDatabase = false;

  beforeAll(async () => {
    db = postgres(process.env.DATABASE_URL!);
    const [target] = await db`SELECT current_database() AS name`;
    if (target.name !== 'resume_copilot_test') throw new Error('Refusing to mutate a non-test database');
    verifiedTestDatabase = true;
    await db`INSERT INTO "user" (id, name, email, email_verified) VALUES
      (${ownerId}, 'Resume Owner', ${`${ownerId}@example.test`}, true),
      (${otherId}, 'Other Owner', ${`${otherId}@example.test`}, true)`;
    const sessionCookie = async (userId: string) => {
      const token = randomUUID();
      await db`INSERT INTO session (id, token, user_id, expires_at)
        VALUES (${randomUUID()}, ${token}, ${userId}, now() + interval '7 days')`;
      const signature = createHmac('sha256', process.env.BETTER_AUTH_SECRET!).update(token).digest('base64');
      return `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
    };
    ownerCookie = await sessionCookie(ownerId);
    otherCookie = await sessionCookie(otherId);
    vi.stubEnv('BODY_LIMIT_BYTES', '1048576');
    app = await createApplication();
    await app.listen(0, '127.0.0.1');
    baseURL = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    if (db) {
      try {
        if (verifiedTestDatabase) await db`DELETE FROM "user" WHERE id IN (${ownerId}, ${otherId})`;
      } finally {
        await db.end();
      }
    }
    vi.unstubAllEnvs();
  });

  function call(method: string, path: string, cookie?: string, body?: unknown, origin?: string) {
    return fetch(`${baseURL}/api/resumes${path}`, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(!['GET', 'HEAD'].includes(method) ? { origin: origin ?? publicOrigin } : {}),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  it('creates a blank resume, lists it, updates it, and deletes it for its owner', async () => {
    const created = await call('POST', '', ownerCookie, { title: '  Manual resume  ' });
    expect(created.status).toBe(201);
    const creation = await created.json() as { data: { id: string; userId: string; title: string; data: Record<string, unknown> }; error: null };
    expect(creation).toMatchObject({ data: { id: expect.any(String), userId: ownerId, title: 'Manual resume', data: { basics: expect.any(Object), modules: expect.any(Object) } }, error: null });
    const id = creation.data.id;

    const listed = await call('GET', '', ownerCookie);
    expect(listed.status).toBe(200);
    const list = await listed.json() as { data: Array<{ id: string; title: string; data?: unknown; userId?: string }>; error: null };
    expect(list.data).toContainEqual(expect.objectContaining({ id, title: 'Manual resume' }));
    expect(list.data.find(item => item.id === id)).not.toHaveProperty('data');
    expect(list.data.find(item => item.id === id)).not.toHaveProperty('userId');

    const editedData = {
      ...creation.data.data,
      basics: { ...(creation.data.data.basics as Record<string, unknown>), name: 'Ada' },
      modules: {
        ...(creation.data.data.modules as Record<string, unknown>),
        skills: { id: 'skills', name: 'Skills', visible: true, items: [{ id: 'skill', visible: true, name: 'Frontend', level: 'Advanced', keywords: ['TypeScript'] }] },
        languages: { id: 'languages', name: 'Languages', visible: true, items: [{ id: 'language', visible: true, language: 'Swedish', fluency: 'Professional' }] },
      },
      sectionOrder: ['languages', 'skills', 'education', 'experience', 'projects'],
    };
    const updated = await call('PATCH', `/${id}`, ownerCookie, { title: 'Updated resume', visibility: 'public', data: editedData });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ data: { id, title: 'Updated resume', visibility: 'public' }, error: null });
    const detail = await call('GET', `/${id}`, ownerCookie);
    expect(await detail.json()).toMatchObject({ data: { title: 'Updated resume', data: editedData }, error: null });

    const deleted = await call('DELETE', `/${id}`, ownerCookie);
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ data: { id }, error: null });
    expect((await call('GET', `/${id}`, ownerCookie)).status).toBe(404);
  });

  it('does not list, read, update or delete another owner’s resume', async () => {
    const created = await call('POST', '', otherCookie, { title: 'Private other resume' });
    const { data: { id } } = await created.json() as { data: { id: string } };
    const listed = await call('GET', '', ownerCookie);
    expect((await listed.json() as { data: Array<{ id: string }> }).data.some(item => item.id === id)).toBe(false);
    expect((await call('GET', `/${id}`, ownerCookie)).status).toBe(404);
    expect((await call('PATCH', `/${id}`, ownerCookie, { title: 'Stolen' })).status).toBe(404);
    expect((await call('DELETE', `/${id}`, ownerCookie)).status).toBe(404);
    expect((await call('GET', `/${id}`, otherCookie)).status).toBe(200);
  });

  it('rejects unauthenticated requests, malformed inputs and cross-origin writes', async () => {
    expect((await call('GET', '')).status).toBe(401);
    expect((await call('POST', '', undefined, { title: 'No session' })).status).toBe(401);
    expect((await call('POST', '', ownerCookie, { data: [] })).status).toBe(400);
    expect((await call('PATCH', '/missing', ownerCookie, { visibility: 'everyone' })).status).toBe(400);
    expect((await call('POST', '', ownerCookie, { title: 'Cross-origin' }, 'https://untrusted.invalid')).status).toBe(403);
    const noOrigin = await fetch(`${baseURL}/api/resumes`, {
      method: 'POST', headers: { cookie: ownerCookie, 'content-type': 'application/json' }, body: '{}',
    });
    expect(noOrigin.status).toBe(403);
  });

  it('protects PDF export before starting Chromium', async () => {
    const created = await call('POST', '', otherCookie, { title: 'Other PDF' });
    const { data: { id } } = await created.json() as { data: { id: string } };
    const exportPdf = (cookie?: string, resumeId?: string, origin = publicOrigin) =>
      fetch(`${baseURL}/api/export-pdf`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin, ...(cookie ? { cookie } : {}) },
        body: JSON.stringify({ resumeId }),
      });

    expect((await exportPdf(undefined, id)).status).toBe(401);
    expect((await exportPdf(ownerCookie, id)).status).toBe(404);
    expect((await exportPdf(ownerCookie, '')).status).toBe(400);
    expect((await exportPdf(otherCookie, id, 'https://untrusted.invalid')).status).toBe(403);
  });

  it('returns the owned resume as a raw PDF response without leaking renderer failures', async () => {
    const { PdfRenderer } = require('../dist/resumes/pdf.renderer.js') as typeof import('../dist/resumes/pdf.renderer.js');
    const pdf = Buffer.from('%PDF-1.4\nmock PDF');
    const render = vi.spyOn(app.get(PdfRenderer), 'render').mockResolvedValue(pdf);
    try {
      const created = await call('POST', '', ownerCookie, { title: 'My PDF' });
      const { data: { id, data } } = await created.json() as { data: { id: string; data: unknown } };
      const exportPdf = () => fetch(`${baseURL}/api/export-pdf`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: publicOrigin, cookie: ownerCookie },
        body: JSON.stringify({ resumeId: id, title: 'Untrusted filename' }),
      });

      const response = await exportPdf();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/^application\/pdf/);
      expect(response.headers.get('content-disposition')).toBe('attachment; filename="resume.pdf"');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf);
      expect(render).toHaveBeenCalledWith(id, data);

      render.mockRejectedValueOnce(new Error('private rendering detail'));
      const failed = await exportPdf();
      expect(failed.status).toBe(500);
      expect(JSON.stringify(await failed.json())).not.toContain('private rendering detail');
    } finally {
      render.mockRestore();
    }
  });
});
