import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { db } from '@/db';
import { resume } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { defaultResumeData } from '@/types/resume/resume';
import { success } from '@/lib/api-response';

/** GET /api/resumes — list all resumes for the current user */
export async function GET() {
  const { user, failure } = await getCurrentUser();
  if (failure) return failure;

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
    .where(eq(resume.userId, user.id))
    .orderBy(desc(resume.updatedAt));

  return success(resumes);
}

/** POST /api/resumes — create a new resume */
export async function POST(request: NextRequest) {
  const { user, failure } = await getCurrentUser();
  if (failure) return failure;

  const body = await request.json();
  const title = body.title?.trim() || 'Untitled Resume';
  const description = body.description?.trim() || '';
  const data = body.data ?? defaultResumeData;

  const id = createId();

  const [created] = await db
    .insert(resume)
    .values({
      id,
      userId: user.id,
      title,
      description,
      data,
    })
    .returning();

  return success(created, 201);
}
