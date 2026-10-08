import { z } from 'zod';
import { itemSchema, urlSchema } from '../common';

export const sectionTypes = ['summary', 'profiles', 'experience', 'education', 'projects', 'skills', 'languages', 'interests', 'awards', 'certifications', 'publications', 'volunteer', 'references'] as const;
export const sectionTypeSchema = z.enum(sectionTypes);
export type SectionType = z.infer<typeof sectionTypeSchema>;
export const contentItemSchemas = {
  profiles: itemSchema.extend({ network: z.string(), username: z.string(), website: urlSchema }),
  languages: itemSchema.extend({ language: z.string(), fluency: z.string(), rating: z.number().min(0).max(5) }),
  interests: itemSchema.extend({ name: z.string(), keywords: z.array(z.string()) }),
  awards: itemSchema.extend({ title: z.string(), awarder: z.string(), date: z.string(), website: urlSchema, summary: z.string() }),
  certifications: itemSchema.extend({ title: z.string(), issuer: z.string(), date: z.string(), website: urlSchema, summary: z.string() }),
  publications: itemSchema.extend({ title: z.string(), publisher: z.string(), date: z.string(), website: urlSchema, summary: z.string() }),
  volunteer: itemSchema.extend({ organization: z.string(), location: z.string(), date: z.string(), website: urlSchema, summary: z.string() }),
  references: itemSchema.extend({ name: z.string(), position: z.string(), phone: z.string(), website: urlSchema, summary: z.string() }),
};
export const contentItemSchema = z.union([
  contentItemSchemas.profiles, contentItemSchemas.languages, contentItemSchemas.interests,
  contentItemSchemas.awards, contentItemSchemas.certifications, contentItemSchemas.publications,
  contentItemSchemas.volunteer, contentItemSchemas.references,
  itemSchema.extend({ summary: z.string() }),
]);
export type ContentItem = { [K in keyof typeof contentItemSchemas]: z.infer<(typeof contentItemSchemas)[K]> }[keyof typeof contentItemSchemas] | z.infer<typeof itemSchema> & { summary: string };
export const contentModuleSchema = z.object({
  id: z.string(), name: z.string(), visible: z.boolean(),
  type: sectionTypeSchema.optional(), content: z.string().optional(),
  items: z.array(contentItemSchema),
});
export type ContentModule = Omit<z.infer<typeof contentModuleSchema>, 'items'> & { items: ContentItem[] };
export type ContentSectionId = Exclude<SectionType, 'education' | 'experience' | 'projects' | 'skills'>;
