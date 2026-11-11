import { z } from 'zod'
import { basicsSchema, defaultBasics, modulesSchema, defaultModules } from './resume/modules'

export * from './resume/modules'
export * from './resume/common'

export const resumeVisibilitySchema = z.enum(['public', 'private'])
export const resumeVersionSchema = z.int().nonnegative()

export const resumeFontFamilies = ['EB Garamond', 'Helvetica', 'Times', 'Courier'] as const
export const resumeTypographyStyleSchema = z
  .object({
    fontFamily: z.enum(resumeFontFamilies),
    fontSize: z.number().min(6).max(36),
    lineHeight: z.number().min(1).max(2.5),
  })
  .partial()
export type ResumeTypographyStyle = z.infer<typeof resumeTypographyStyleSchema>

export const resumeTypographyPresetIds = [
  'classic',
  'traditional',
  'balanced',
  'professional',
  'clean',
] as const
export type ResumeTypographyPresetId = (typeof resumeTypographyPresetIds)[number]

export const resumeTextSize = { min: 9, max: 12.5, step: 0.5, default: 10 } as const

const resumeTypographySchema = z.union([
  z.object({
    preset: z.enum(resumeTypographyPresetIds),
    textSize: z
      .number()
      .min(resumeTextSize.min)
      .max(resumeTextSize.max)
      .multipleOf(resumeTextSize.step),
  }),
  z.object({
    preset: z.never().optional(),
    textSize: z.never().optional(),
    heading: resumeTypographyStyleSchema.optional(),
    body: resumeTypographyStyleSchema.optional(),
  }),
])

export const resumeThemeColorSchema = z
  .enum(['blue', 'moss', 'teal', 'plum', 'rust', 'burgundy', 'ochre', 'graphite'])
  .or(z.string().regex(/^#[0-9a-f]{6}$/i))

export const resumeTemplateSchema = z.enum(['onyx', 'meowth', 'kakuna', 'scizor'])

export const resumeDataSchema = z.object({
  basics: basicsSchema,
  modules: modulesSchema,
  // Optional so existing documents retain their original print order.
  sectionOrder: z.array(z.string()).optional(),
  typography: resumeTypographySchema.optional(),
  design: z
    .object({
      template: resumeTemplateSchema.optional(),
      density: z.enum(['compact', 'normal', 'roomy']).optional(),
      themeColor: resumeThemeColorSchema.optional(),
    })
    .optional(),
})

export const defaultResumeData = {
  basics: defaultBasics,
  modules: defaultModules,
} satisfies z.infer<typeof resumeDataSchema>

export const resumeAvatarSize = 256
export const resumeAvatarMaxBytes = 100 * 1024
export const uploadResumeAvatarSchema = z.object({
  jpeg: z.base64().max(Math.ceil(resumeAvatarMaxBytes / 3) * 4),
})
export const resumeAvatarSchema = z.string().startsWith('data:image/jpeg;base64,').nullable()

export const resumeSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(20, 'Title must be at most 20 characters'),
  data: resumeDataSchema,
  description: z.string(),
  visibility: resumeVisibilitySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  avatar: resumeAvatarSchema.optional(),
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
    expectedVersion: resumeVersionSchema.optional(),
    title: z.string().trim().min(1).max(20).optional(),
    description: z.string().optional(),
    data: resumeDataSchema.optional(),
    visibility: resumeVisibilitySchema.optional(),
  })
  .refine(({ expectedVersion: _expectedVersion, ...changes }) => Object.keys(changes).length > 0)

export type CreateResume = z.infer<typeof createResumeSchema>
export type UpdateResume = z.infer<typeof updateResumeSchema>
