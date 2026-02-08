import { defaultItem, itemSchema, urlSchema } from './../common/';
import { z } from 'zod';

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
  items: z.array(customSchema),
});

export type CustomModule = z.infer<typeof customModuleSchema>;

export type CustomModuleId = `custom-${string}`;
