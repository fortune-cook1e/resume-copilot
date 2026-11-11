import { Injectable } from '@nestjs/common'
import { and, desc, eq, gt, sql, type SQL } from 'drizzle-orm'
import type { CreateResume, UpdateResume } from '@resume-copilot/contracts'
import { DatabaseService } from '../database/database.module'
import { resume, resumeAvatar, resumeCreateRequest } from '../database/schema/resume.schema'

@Injectable()
export class ResumesRepository {
  constructor(private readonly database: DatabaseService) {}

  list(userId: string) {
    return this.database.db
      .select({
        id: resume.id,
        title: resume.title,
        description: resume.description,
        visibility: resume.visibility,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      })
      .from(resume)
      .where(eq(resume.userId, userId))
      .orderBy(desc(resume.updatedAt))
  }

  listTitles(userId: string, limit: number, cursor?: string) {
    return this.database.db
      .select({ id: resume.id, title: resume.title })
      .from(resume)
      .where(and(eq(resume.userId, userId), cursor ? gt(resume.id, cursor) : undefined))
      .orderBy(resume.id)
      .limit(limit)
  }

  async find(userId: string, id: string) {
    const [found] = await this.database.db
      .select()
      .from(resume)
      .where(and(eq(resume.id, id), eq(resume.userId, userId)))
      .limit(1)
    return found
  }

  async create(userId: string, id: string, input: Required<CreateResume>) {
    const [created] = await this.database.db
      .insert(resume)
      .values({ id, userId, ...input })
      .returning()
    return created
  }

  findAvatar(userId: string, id: string) {
    return this.database.db
      .select({ jpeg: resumeAvatar.jpeg })
      .from(resume)
      .leftJoin(resumeAvatar, eq(resumeAvatar.resumeId, resume.id))
      .where(and(eq(resume.id, id), eq(resume.userId, userId)))
      .get()
  }

  async writeAvatar(userId: string, id: string, jpeg: Buffer) {
    const db = this.database.db
    const result = await db.run(sql`
      INSERT INTO resume_avatar (resume_id, jpeg)
      SELECT id, ${jpeg} FROM resume WHERE id = ${id} AND user_id = ${userId}
      ON CONFLICT (resume_id) DO UPDATE SET jpeg = excluded.jpeg
    `)
    return result.meta.changes > 0
  }

  deleteAvatar(userId: string, id: string) {
    return this.database.db.run(sql`
      DELETE FROM resume_avatar WHERE resume_id IN (
        SELECT id FROM resume WHERE id = ${id} AND user_id = ${userId}
      )
    `)
  }

  findCreateReceipt(userId: string, requestKey: string) {
    return this.database.db
      .select({
        resumeId: resumeCreateRequest.resumeId,
        requestHash: resumeCreateRequest.requestHash,
        version: resumeCreateRequest.version,
      })
      .from(resumeCreateRequest)
      .where(
        and(eq(resumeCreateRequest.userId, userId), eq(resumeCreateRequest.requestKey, requestKey)),
      )
      .get()
  }

  async createOnce(
    userId: string,
    id: string,
    input: Required<CreateResume>,
    request: { key: string; hash: string },
    copyAvatarFrom?: string,
  ) {
    const db = this.database.db
    const previous = await this.findCreateReceipt(userId, request.key)
    if (previous) return previous

    const now = new Date()
    const receipt = { resumeId: id, requestHash: request.hash, version: now.getTime() }
    try {
      await db.batch([
        db.insert(resume).values({ id, userId, ...input, createdAt: now, updatedAt: now }),
        db.insert(resumeCreateRequest).values({ userId, requestKey: request.key, ...receipt }),
        ...(copyAvatarFrom
          ? [
              db.insert(resumeAvatar).select(
                db
                  .select({ resumeId: sql<string>`${id}`.as('resume_id'), jpeg: resumeAvatar.jpeg })
                  .from(resumeAvatar)
                  .innerJoin(resume, eq(resumeAvatar.resumeId, resume.id))
                  .where(and(eq(resume.id, copyAvatarFrom), eq(resume.userId, userId))),
              ),
            ]
          : []),
      ])
      return receipt
    } catch (error) {
      // A concurrent request may have saved the receipt while this batch rolled back.
      const completed = await this.findCreateReceipt(userId, request.key)
      if (completed) return completed
      throw error
    }
  }

  update(userId: string, id: string, { expectedVersion, ...changes }: UpdateResume) {
    return this.write(userId, id, changes, expectedVersion)
  }

  patchContent(userId: string, id: string, version: number, path: string, value: string | object) {
    return this.write(
      userId,
      id,
      {
        data: sql`json_set(${resume.data}, ${path}, json(${JSON.stringify(value)}))`,
      },
      version,
    )
  }

  private async write(
    userId: string,
    id: string,
    input: Omit<UpdateResume, 'data' | 'expectedVersion'> & { data?: UpdateResume['data'] | SQL },
    expectedVersion?: number,
  ) {
    const [updated] = await this.database.db
      .update(resume)
      .set({ ...input, updatedAt: sql`max(${resume.updatedAt} + 1, ${Date.now()})` })
      .where(
        and(
          eq(resume.id, id),
          eq(resume.userId, userId),
          expectedVersion === undefined ? undefined : sql`${resume.updatedAt} = ${expectedVersion}`,
        ),
      )
      .returning()
    return updated
  }

  async delete(userId: string, id: string, expectedVersion?: number) {
    const [deleted] = await this.database.db
      .delete(resume)
      .where(
        and(
          eq(resume.id, id),
          eq(resume.userId, userId),
          expectedVersion === undefined ? undefined : sql`${resume.updatedAt} = ${expectedVersion}`,
        ),
      )
      .returning({ id: resume.id })
    return deleted
  }
}
