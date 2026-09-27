import { z } from 'zod';

export const resumeVisibilitySchema = z.enum(['public', 'private']);

// The legacy editor owns its field-level form schema. The HTTP contract only
// requires the structured document envelope until that schema is redesigned.
export const resumeDataSchema = z.object({
  basics: z.record(z.string(), z.unknown()),
  modules: z.record(z.string(), z.unknown()),
});

export const defaultResumeData = {
  basics: {
    name: '', email: '', phone: '', location: '',
    website: { icon: '', label: '', link: '' },
    headline: '', picture: { url: '', size: 64 }, customFields: [],
  },
  modules: {
    education: { name: 'Education', id: 'education', visible: true, items: [] },
    experience: { name: 'Experience', id: 'experience', visible: true, items: [] },
    projects: { name: 'Projects', id: 'projects', visible: true, items: [] },
    skills: { name: 'Skills', id: 'skills', visible: true, items: [] },
  },
} satisfies z.infer<typeof resumeDataSchema>;

export const createResumeSchema = z.object({
  title: z.string().trim().max(20).optional(),
  description: z.string().trim().optional(),
  data: resumeDataSchema.optional(),
  visibility: resumeVisibilitySchema.optional(),
});

export const updateResumeSchema = z.object({
  title: z.string().trim().min(1).max(20).optional(),
  description: z.string().optional(),
  data: resumeDataSchema.optional(),
  visibility: resumeVisibilitySchema.optional(),
}).refine(value => Object.keys(value).length > 0);

export const exportResumePdfSchema = z.object({
  resumeId: z.string().trim().min(1),
});

export type CreateResume = z.infer<typeof createResumeSchema>;
export type UpdateResume = z.infer<typeof updateResumeSchema>;
