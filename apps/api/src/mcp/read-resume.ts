import { NotFoundException } from '@nestjs/common'
import {
  mcpResumeFields,
  type mcpResumeReadInputSchema,
  type mcpResumeReadResultSchema,
  resumeDataSchema,
} from '@resume-copilot/contracts'
import type { z } from 'zod'
import type { ResumesService } from '../resumes/resumes.service'

type ReadInput = z.infer<typeof mcpResumeReadInputSchema>
type ReadResult = z.infer<typeof mcpResumeReadResultSchema>

function projectEntries<Item extends { id: string }, Field extends keyof Item>(
  items: Item[],
  selection: { entryIds?: string[]; fields?: Field[] },
  allowedFields: Field[],
) {
  const selectedIds = selection.entryIds && new Set(selection.entryIds)
  const fields = selection.fields ?? allowedFields
  return items
    .filter((item) => !selectedIds || selectedIds.has(item.id))
    .map((item) => {
      const projected: Partial<Pick<Item, Field>> = {}
      for (const field of fields) projected[field] = item[field]
      return { id: item.id, ...projected }
    })
}

export async function readResume(
  resumes: ResumesService,
  userId: string,
  { resumeId, sections }: ReadInput,
  canReadFullResume: boolean,
): Promise<ReadResult> {
  const resume = await resumes.find(userId, resumeId).catch((error: unknown) => {
    if (error instanceof NotFoundException) throw new Error('Resume not found.')
    throw new Error('Could not read the resume.')
  })
  const result: ReadResult = {
    id: resume.id,
    title: resume.title,
    version: resume.updatedAt.getTime(),
    ...(canReadFullResume
      ? { description: resume.description, visibility: resume.visibility }
      : {}),
  }
  if (!sections && !canReadFullResume) return result

  const parsed = resumeDataSchema.safeParse(resume.data)
  if (!parsed.success) throw new Error('Could not read the resume content.')
  if (!sections) return { ...result, data: parsed.data }
  const { modules } = parsed.data
  const projected: NonNullable<ReadResult['sections']> = {}
  if (sections.summary) {
    projected.summary = {
      content: modules.summary?.content ?? '',
      items: modules.summary?.items.map(({ id, summary }) => ({ id, summary })) ?? [],
    }
  }
  if (sections.experience)
    projected.experience = projectEntries(
      modules.experience.items,
      sections.experience,
      mcpResumeFields.experience.options,
    )
  if (sections.projects)
    projected.projects = projectEntries(
      modules.projects.items,
      sections.projects,
      mcpResumeFields.projects.options,
    )
  if (sections.education)
    projected.education = projectEntries(
      modules.education.items,
      sections.education,
      mcpResumeFields.education.options,
    )
  if (sections.skills)
    projected.skills = projectEntries(
      modules.skills.items,
      sections.skills,
      mcpResumeFields.skills.options,
    )
  return { ...result, sections: projected }
}
