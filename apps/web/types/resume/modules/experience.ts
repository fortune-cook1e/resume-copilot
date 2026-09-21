import { defaultItem, itemSchema } from './../common';
import { z } from 'zod';

export const experienceSchema = itemSchema.extend({
  company: z.string(),
  position: z.string(),
  location: z.string(),
  date: z.string(),
  summary: z.string(),
});
export type Experience = z.infer<typeof experienceSchema>;

export const defaultExperience: Experience = {
  ...defaultItem,
  company: '',
  position: '',
  location: '',
  date: '',
  summary: '',
};
