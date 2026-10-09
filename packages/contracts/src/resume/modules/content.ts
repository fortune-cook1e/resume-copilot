import { z } from 'zod'
import { itemSchema, urlSchema } from '../common'

export const sectionTypes = [
  'summary',
  'profiles',
  'experience',
  'education',
  'projects',
  'skills',
  'languages',
  'interests',
  'awards',
  'certifications',
  'publications',
  'volunteer',
  'references',
] as const
export const sectionTypeSchema = z.enum(sectionTypes)
export type SectionType = z.infer<typeof sectionTypeSchema>
export const contentItemSchemas = {
  profiles: itemSchema.extend({ network: z.string(), username: z.string(), website: urlSchema }),
  languages: itemSchema.extend({
    language: z.string(),
    fluency: z.string(),
    rating: z.number().min(0).max(5).optional(),
  }),
  interests: itemSchema.extend({ name: z.string(), keywords: z.array(z.string()) }),
  awards: itemSchema.extend({
    title: z.string(),
    awarder: z.string(),
    date: z.string(),
    website: urlSchema,
    summary: z.string(),
  }),
  certifications: itemSchema.extend({
    title: z.string(),
    issuer: z.string(),
    date: z.string(),
    website: urlSchema,
    summary: z.string(),
  }),
  publications: itemSchema.extend({
    title: z.string(),
    publisher: z.string(),
    date: z.string(),
    website: urlSchema,
    summary: z.string(),
  }),
  volunteer: itemSchema.extend({
    organization: z.string(),
    location: z.string(),
    date: z.string(),
    website: urlSchema,
    summary: z.string(),
  }),
  references: itemSchema.extend({
    name: z.string(),
    position: z.string(),
    phone: z.string(),
    website: urlSchema,
    summary: z.string(),
  }),
}
export const summaryItemSchema = itemSchema.extend({ summary: z.string() })
export const contentItemSchema = z.union([
  contentItemSchemas.profiles,
  contentItemSchemas.languages,
  contentItemSchemas.interests,
  contentItemSchemas.awards,
  contentItemSchemas.certifications,
  contentItemSchemas.publications,
  contentItemSchemas.volunteer,
  contentItemSchemas.references,
  summaryItemSchema,
])
export type ContentItem = z.infer<typeof contentItemSchema>

const contentModuleBase = z.object({
  name: z.string(),
  visible: z.boolean(),
  content: z.string().optional(),
})
export const contentModuleSchemas = {
  summary: contentModuleBase.extend({
    id: z.literal('summary'),
    type: z.literal('summary').optional(),
    items: z.array(summaryItemSchema),
  }),
  profiles: contentModuleBase.extend({
    id: z.literal('profiles'),
    type: z.literal('profiles').optional(),
    items: z.array(contentItemSchemas.profiles),
  }),
  languages: contentModuleBase.extend({
    id: z.literal('languages'),
    type: z.literal('languages').optional(),
    items: z.array(contentItemSchemas.languages),
  }),
  interests: contentModuleBase.extend({
    id: z.literal('interests'),
    type: z.literal('interests').optional(),
    items: z.array(contentItemSchemas.interests),
  }),
  awards: contentModuleBase.extend({
    id: z.literal('awards'),
    type: z.literal('awards').optional(),
    items: z.array(contentItemSchemas.awards),
  }),
  certifications: contentModuleBase.extend({
    id: z.literal('certifications'),
    type: z.literal('certifications').optional(),
    items: z.array(contentItemSchemas.certifications),
  }),
  publications: contentModuleBase.extend({
    id: z.literal('publications'),
    type: z.literal('publications').optional(),
    items: z.array(contentItemSchemas.publications),
  }),
  volunteer: contentModuleBase.extend({
    id: z.literal('volunteer'),
    type: z.literal('volunteer').optional(),
    items: z.array(contentItemSchemas.volunteer),
  }),
  references: contentModuleBase.extend({
    id: z.literal('references'),
    type: z.literal('references').optional(),
    items: z.array(contentItemSchemas.references),
  }),
}
export const contentModuleSchema = z.discriminatedUnion('id', [
  contentModuleSchemas.summary,
  contentModuleSchemas.profiles,
  contentModuleSchemas.languages,
  contentModuleSchemas.interests,
  contentModuleSchemas.awards,
  contentModuleSchemas.certifications,
  contentModuleSchemas.publications,
  contentModuleSchemas.volunteer,
  contentModuleSchemas.references,
])
export type ContentModule = z.infer<typeof contentModuleSchema>
export type ContentSectionId = Exclude<
  SectionType,
  'education' | 'experience' | 'projects' | 'skills'
>
