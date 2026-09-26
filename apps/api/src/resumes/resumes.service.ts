import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { defaultResumeData, type CreateResume, type UpdateResume } from '@resume-copilot/contracts';
import { ResumesRepository } from './resumes.repository';

@Injectable()
export class ResumesService {
  constructor(private readonly repository: ResumesRepository) {}

  list(userId: string) {
    return this.repository.list(userId);
  }

  async find(userId: string, id: string) {
    const found = await this.repository.find(userId, id);
    if (!found) throw new NotFoundException();
    return found;
  }

  create(userId: string, input: CreateResume) {
    return this.repository.create(userId, randomUUID(), {
      title: input.title || 'Untitled Resume',
      description: input.description ?? '',
      data: input.data ?? structuredClone(defaultResumeData),
      visibility: input.visibility ?? 'private',
    });
  }

  async update(userId: string, id: string, input: UpdateResume) {
    const updated = await this.repository.update(userId, id, input);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  async delete(userId: string, id: string) {
    const deleted = await this.repository.delete(userId, id);
    if (!deleted) throw new NotFoundException();
    return deleted;
  }
}
