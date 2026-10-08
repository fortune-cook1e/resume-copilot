import { defaultItem, itemSchema } from './../common';
import { z } from 'zod';

export const educationSchema = itemSchema.extend({
  university: z.string(),
  major: z.string(),
  location: z.string(),
  date: z.string(),
  summary: z.string(),
});
export type Education = z.infer<typeof educationSchema>;

export const defaultEducation: Education = {
  ...defaultItem,
  university: '',
  major: '',
  location: '',
  date: '',
  summary: '',
};
