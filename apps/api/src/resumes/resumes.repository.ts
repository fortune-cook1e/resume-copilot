import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { CreateResume, UpdateResume } from '@resume-copilot/contracts';
import { DatabaseService } from '../database/database.module';
import { resume } from '../database/schema/resume.schema';

@Injectable()
export class ResumesRepository {
  constructor(private readonly database: DatabaseService) {}

  list(userId: string) {
    return this.database.db.select({
      id: resume.id, title: resume.title, description: resume.description,
      visibility: resume.visibility, createdAt: resume.createdAt, updatedAt: resume.updatedAt,
    }).from(resume).where(eq(resume.userId, userId)).orderBy(desc(resume.updatedAt));
  }

  async find(userId: string, id: string) {
    const [found] = await this.database.db.select().from(resume)
      .where(and(eq(resume.id, id), eq(resume.userId, userId))).limit(1);
    return found;
  }

  async create(userId: string, id: string, input: Required<CreateResume>) {
    const [created] = await this.database.db.insert(resume).values({ id, userId, ...input }).returning();
    return created;
  }

  async update(userId: string, id: string, input: UpdateResume) {
    const [updated] = await this.database.db.update(resume)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(resume.id, id), eq(resume.userId, userId))).returning();
    return updated;
  }

  async delete(userId: string, id: string) {
    const [deleted] = await this.database.db.delete(resume)
      .where(and(eq(resume.id, id), eq(resume.userId, userId))).returning({ id: resume.id });
    return deleted;
  }
}
