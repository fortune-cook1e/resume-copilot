import { defaultItem, itemSchema } from '@/types/resume/common';
import z from 'zod';

export const skillsSchema = itemSchema.extend({
  name: z.string(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  keywords: z.array(z.string()).default([]),
});

export type Skills = z.infer<typeof skillsSchema>;

export const defaultSkills: Skills = {
  ...defaultItem,
  name: '',
  level: 'Beginner',
  keywords: [],
};
