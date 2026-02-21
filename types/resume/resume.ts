import {
  defaultModules,
  defaultBasics,
  modulesSchema,
  basicsSchema,
  type Modules,
} from '@/types/resume';
import { z } from 'zod';

export const sectionSchema = z.object({
  name: z.string(),
  visible: z.boolean().default(true),
});

export const resumeDataSchema = z.object({
  basics: basicsSchema,
  modules: modulesSchema,
});

// default resume data
export const defaultResumeData = {
  basics: defaultBasics,
  modules: defaultModules,
} satisfies z.infer<typeof resumeDataSchema>;

export const resumeSchema = z.object({
  id: z.string(),
  title: z.string(),
  data: resumeDataSchema.default(defaultResumeData),
  description: z.string(),
  visibility: z.enum(['public', 'private']).default('private'),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type ResumeVisibility = 'public' | 'private';

export type ResumeData = Omit<z.infer<typeof resumeDataSchema>, 'modules'> & {
  modules: Modules;
};

export type Resume = z.infer<typeof resumeSchema>;

// Lightweight resume item for list views (no data payload)
export type ResumeItem = Omit<Resume, 'data'>;
