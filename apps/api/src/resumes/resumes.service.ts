import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import {
  defaultResumeData,
  defaultSummary,
  resumeDataSchema,
  type CreateResume,
  type McpResumeUpdate,
  type McpResumePatch,
  type McpResumeDuplicate,
  type UpdateResume,
} from '@resume-copilot/contracts'
import { ResumesRepository } from './resumes.repository'
import { applyResumeOperations } from './resume-patch'

function creationFields(input: CreateResume): Required<CreateResume> {
  return {
    title: input.title || 'Untitled Resume',
    description: input.description ?? '',
    data: input.data ?? structuredClone(defaultResumeData),
    visibility: input.visibility ?? 'private',
  }
}

@Injectable()
export class ResumesService {
  constructor(private readonly repository: ResumesRepository) {}

  list(userId: string) {
    return this.repository.list(userId)
  }

  async listForMcp(userId: string, cursor?: string) {
    const pageSize = 25
    const rows = await this.repository.listTitles(userId, pageSize + 1, cursor)
    const resumes = rows.slice(0, pageSize)
    return { resumes, nextCursor: rows.length > pageSize ? resumes.at(-1)!.id : null }
  }

  async find(userId: string, id: string) {
    const found = await this.repository.find(userId, id)
    if (!found) throw new NotFoundException()
    return found
  }

  create(userId: string, input: CreateResume) {
    return this.repository.create(userId, randomUUID(), creationFields(input))
  }

  async createForMcp(
    userId: string,
    input: Pick<CreateResume, 'title' | 'data' | 'description'>,
    request: { key: string; hash: string },
  ) {
    const fields = creationFields({ ...input, visibility: 'private' })
    const receipt = await this.repository.createOnce(userId, randomUUID(), fields, request)
    if (receipt.requestHash !== request.hash)
      throw new ConflictException('This request key was already used for different resume content.')
    return { id: receipt.resumeId, title: fields.title, version: receipt.version }
  }

  async duplicateForMcp(
    userId: string,
    { resumeId, version, title, requestKey }: McpResumeDuplicate,
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ resumeId, version, title }))
      .digest('base64url')
    const receipt = await this.repository.findCreateReceipt(userId, requestKey)
    if (receipt) {
      if (receipt.requestHash !== hash)
        throw new ConflictException(
          'This request key was already used for different resume content.',
        )
      return { id: receipt.resumeId, title, version: receipt.version }
    }

    const source = await this.find(userId, resumeId)
    if (source.updatedAt.getTime() !== version)
      throw new ConflictException(
        'Resume version conflict. Read the latest version before copying.',
      )
    const data = resumeDataSchema.safeParse(source.data)
    if (!data.success) throw new BadRequestException('Could not read the resume content.')
    return this.createForMcp(
      userId,
      { title, description: source.description, data: data.data },
      { key: requestKey, hash },
    )
  }

  async update(userId: string, id: string, input: UpdateResume) {
    const updated = await this.repository.update(userId, id, input)
    if (updated) return updated
    if (input.expectedVersion !== undefined && (await this.repository.find(userId, id)))
      throw new ConflictException()
    throw new NotFoundException()
  }

  async updateText(userId: string, { resumeId, version, target, text }: McpResumeUpdate) {
    const current = await this.find(userId, resumeId)
    if (current.updatedAt.getTime() !== version) throw new ConflictException()
    const parsed = resumeDataSchema.safeParse(current.data)
    if (!parsed.success) throw new BadRequestException()
    const { modules } = parsed.data

    let path: string
    let value: string | object = text
    if (target.section === 'summary') {
      path = modules.summary ? '$.modules.summary.content' : '$.modules.summary'
      if (!modules.summary) value = { ...defaultSummary, content: text }
    } else {
      const items = modules[target.section].items
      const matches = (item: { id: string }) => item.id === target.entryId
      const index = items.findIndex(matches)
      if (index < 0 || index !== items.findLastIndex(matches)) throw new NotFoundException()
      const field = target.section === 'projects' ? target.field : 'summary'
      path = `$.modules.${target.section}.items[${index}].${field}`
    }
    const updated = await this.repository.patchContent(userId, resumeId, version, path, value)
    if (!updated) {
      await this.find(userId, resumeId)
      throw new ConflictException()
    }
    return { id: updated.id, version: updated.updatedAt.getTime() }
  }

  async applyPatch(userId: string, { resumeId, version, operations }: McpResumePatch) {
    const current = await this.find(userId, resumeId)
    if (current.updatedAt.getTime() !== version) throw new ConflictException()
    const parsed = resumeDataSchema.safeParse(current.data)
    if (!parsed.success) throw new BadRequestException('Could not read the resume content.')

    applyResumeOperations(parsed.data, operations)
    const updatedData = resumeDataSchema.safeParse(parsed.data)
    if (!updatedData.success) throw new BadRequestException('Invalid resume content.')
    const saved = await this.update(userId, resumeId, {
      expectedVersion: version,
      data: updatedData.data,
    })
    return { id: saved.id, version: saved.updatedAt.getTime() }
  }

  async delete(userId: string, id: string, expectedVersion?: number) {
    const deleted = await this.repository.delete(userId, id, expectedVersion)
    if (deleted) return deleted
    if (expectedVersion !== undefined && (await this.repository.find(userId, id)))
      throw new ConflictException()
    throw new NotFoundException()
  }
}
