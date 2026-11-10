import { ConflictException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import {
  defaultResumeData,
  resumeDataSchema,
  type mcpResumeCreateInputSchema,
} from '@resume-copilot/contracts'
import type { z } from 'zod'
import type { ResumesService } from '../resumes/resumes.service'
import { createDraftSection, mergeBasics, validateOrder } from '../resumes/resume-draft'

type CreateInput = z.infer<typeof mcpResumeCreateInputSchema>

function prepareDraft(draft: NonNullable<CreateInput['data']>) {
  const sections = { ...draft.modules }
  for (const id of ['summary', 'experience', 'projects', 'education', 'skills'] as const) {
    const value = draft[id]
    if (value === undefined) continue
    if (Object.hasOwn(sections, id)) throw new Error(`Supply ${id} only once.`)
    sections[id] = typeof value === 'string' ? { content: value } : { items: value }
  }
  const modules = {
    ...defaultResumeData.modules,
    ...Object.fromEntries(
      Object.entries(sections).map(([id, section]) => [id, createDraftSection(id, section)]),
    ),
  }
  if (draft.sectionOrder) validateOrder(draft.sectionOrder, Object.keys(modules))
  const validated = resumeDataSchema.safeParse({
    basics: mergeBasics(defaultResumeData.basics, draft.basics),
    modules,
    sectionOrder: draft.sectionOrder,
    design: draft.design,
    typography: draft.typography,
  })
  if (!validated.success) throw new Error('Invalid resume content.')
  return validated.data
}

export async function createResume(
  resumes: ResumesService,
  userId: string,
  origin: string,
  { requestKey, title, data, description }: CreateInput,
) {
  // The schema normalizes input before hashing, and IDs are generated afterward.
  const input = Buffer.from(JSON.stringify({ title, data, description }))
  if (input.byteLength > 64 * 1024) throw new Error('Resume draft exceeds 64 KiB.')
  const draft = data ? prepareDraft(data) : undefined
  const result = await resumes
    .createForMcp(
      userId,
      { title, data: draft, description },
      {
        key: requestKey,
        hash: createHash('sha256').update(input).digest('base64url'),
      },
    )
    .catch((error: unknown) => {
      if (error instanceof ConflictException)
        throw new Error('This request key was already used for different resume content.')
      throw new Error('Could not create the resume. Retry with the same request key.')
    })
  return { ...result, editorUrl: origin + '/builder/' + encodeURIComponent(result.id) }
}
