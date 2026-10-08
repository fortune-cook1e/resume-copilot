import { defaultItem, itemSchema, urlSchema } from './../common/';
import { z } from 'zod';
import { educationSchema } from './education';
import { experienceSchema } from './experience';
import { projectsSchema } from './projects';
import { skillsSchema } from './skills';
import { contentItemSchema, sectionTypeSchema, type ContentItem } from './content';

export const customSchema = itemSchema.extend({
  name: z.string(),
  description: z.string(),
  date: z.string(),
  location: z.string(),
  website: urlSchema,
  summary: z.string(),
});

export type Custom = z.infer<typeof customSchema>;

export const defaultCustom: Custom = {
  ...defaultItem,
  name: '',
  description: '',
  date: '',
  location: '',
  website: {
    icon: '',
    link: '',
    label: '',
  },
  summary: '',
};

export const customModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  visible: z.boolean().default(true),
  type: sectionTypeSchema.optional(),
  items: z.array(z.union([customSchema, educationSchema, experienceSchema, projectsSchema, skillsSchema, contentItemSchema])),
});

export type ResumeEntry = Custom | z.infer<typeof educationSchema> | z.infer<typeof experienceSchema> | z.infer<typeof projectsSchema> | z.infer<typeof skillsSchema> | ContentItem;
export type CustomModule = Omit<z.infer<typeof customModuleSchema>, 'items'> & { items: ResumeEntry[] };

export type CustomModuleId = `custom-${string}`;
