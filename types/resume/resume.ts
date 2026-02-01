import { defaultPersonalInfo, PersonalInfoSchema } from '@/types/resume';
import { z } from 'zod';

export const resumeDataSchema = z.object({
  personalInfo: PersonalInfoSchema,
});

// default resume data
export const defaultResumeData: ResumeData = {
  personalInfo: defaultPersonalInfo,
};

export type ResumeData = z.infer<typeof resumeDataSchema>;

export const resumeSchema = z.object({
  id: z.string(),
  title: z.string(),
  data: resumeDataSchema.default(defaultResumeData),
  description: z.string(),
  visibility: z.enum(['public', 'private']).default('private'),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type Resume = z.infer<typeof resumeSchema>;
