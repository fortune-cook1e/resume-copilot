import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { db } from '@/db';
import { resume } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { success, error } from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

/** GET /api/resumes/[id] — get a single resume */
export async function GET(_request: NextRequest, { params }: Params) {
  const { user, failure } = await getCurrentUser();
  if (failure) return failure;

  const { id } = await params;
  const [found] = await db
    .select()
    .from(resume)
    .where(and(eq(resume.id, id), eq(resume.userId, user.id)));

  if (!found) {
    return error('Resume not found', 404);
  }

  return success(found);
}

/** PATCH /api/resumes/[id] — update a resume */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, failure } = await getCurrentUser();
  if (failure) return failure;

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.data !== undefined) updateData.data = body.data;
  if (body.visibility !== undefined) updateData.visibility = body.visibility;

  const [updated] = await db
    .update(resume)
    .set(updateData)
    .where(and(eq(resume.id, id), eq(resume.userId, user.id)))
    .returning();

  if (!updated) {
    return error('Resume not found', 404);
  }

  return success(updated);
}

/** DELETE /api/resumes/[id] — delete a resume */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, failure } = await getCurrentUser();
  if (failure) return failure;

  const { id } = await params;

  const [deleted] = await db
    .delete(resume)
    .where(and(eq(resume.id, id), eq(resume.userId, user.id)))
    .returning({ id: resume.id });

  if (!deleted) {
    return error('Resume not found', 404);
  }

  return success({ id: deleted.id });
}
