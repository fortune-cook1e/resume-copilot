import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { resume } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { defaultResumeData } from '@/types/resume/resume';
import { success, error } from '@/lib/api-response';

/** GET /api/resumes — list all resumes for the current user */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return error('Unauthorized', 401);
  }

  const resumes = await db
    .select({
      id: resume.id,
      title: resume.title,
      description: resume.description,
      visibility: resume.visibility,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    })
    .from(resume)
    .where(eq(resume.userId, session.user.id))
    .orderBy(desc(resume.updatedAt));

  return success(resumes);
}

/** POST /api/resumes — create a new resume */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return error('Unauthorized', 401);
  }

  const body = await request.json();
  const title = body.title?.trim() || 'Untitled Resume';
  const description = body.description?.trim() || '';
  const data = body.data ?? defaultResumeData;

  const id = createId();

  const [created] = await db
    .insert(resume)
    .values({
      id,
      userId: session.user.id,
      title,
      description,
      data,
    })
    .returning();

  return success(created, 201);
}
