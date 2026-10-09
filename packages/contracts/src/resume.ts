import { z } from 'zod'
import { basicsSchema, defaultBasics, modulesSchema, defaultModules } from './resume/modules'

export * from './resume/modules'
export * from './resume/common'

export const resumeVisibilitySchema = z.enum(['public', 'private'])

export const resumeDataSchema = z.object({
  basics: basicsSchema,
  modules: modulesSchema,
  // Optional so existing documents retain their original print order.
  sectionOrder: z.array(z.string()).optional(),
})

export const defaultResumeData = {
  basics: defaultBasics,
  modules: defaultModules,
} satisfies z.infer<typeof resumeDataSchema>

export const resumeSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(20, 'Title must be at most 20 characters'),
  data: resumeDataSchema,
  description: z.string(),
  visibility: resumeVisibilitySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const resumeItemSchema = resumeSchema.omit({ data: true })
export const deletedResumeSchema = z.object({ id: z.string() })

export type ResumeVisibility = z.infer<typeof resumeVisibilitySchema>
export type ResumeData = z.infer<typeof resumeDataSchema>
export type Resume = z.infer<typeof resumeSchema>
export type ResumeItem = z.infer<typeof resumeItemSchema>

export const createResumeSchema = z.object({
  title: z.string().trim().max(20).optional(),
  description: z.string().trim().optional(),
  data: resumeDataSchema.optional(),
  visibility: resumeVisibilitySchema.optional(),
})

export const updateResumeSchema = z
  .object({
    title: z.string().trim().min(1).max(20).optional(),
    description: z.string().optional(),
    data: resumeDataSchema.optional(),
    visibility: resumeVisibilitySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0)

export const exportResumePdfSchema = z.object({
  resumeId: z.string().trim().min(1),
})

export type CreateResume = z.infer<typeof createResumeSchema>
export type UpdateResume = z.infer<typeof updateResumeSchema>
