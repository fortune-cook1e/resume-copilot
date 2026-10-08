import { defaultItem, itemSchema, urlSchema } from './../common/';
import { z } from 'zod';

export const projectsSchema = itemSchema.extend({
  name: z.string(),
  description: z.string(),
  date: z.string(),
  website: urlSchema,
  summary: z.string(),
});

export type Projects = z.infer<typeof projectsSchema>;
export const defaultProjects: Projects = {
  ...defaultItem,
  name: '',
  description: '',
  date: '',
  website: {
    icon: '',
    link: '',
    label: '',
  },
  summary: '',
};
