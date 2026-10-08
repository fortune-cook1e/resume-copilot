import { defaultItem, itemSchema, urlSchema } from './../common/';
import { z } from 'zod';
import { educationSchema } from './education';
import { experienceSchema } from './experience';
import { projectsSchema } from './projects';
import { skillsSchema } from './skills';
import { contentItemSchemas, summaryItemSchema } from './content';

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

const customModuleBase = z.object({
  id: z.string().regex(/^custom-.+/),
  name: z.string(),
  visible: z.boolean().default(true),
});

// Untyped custom sections retain the original entry shape. Typed sections use
// their declared entry schema, so parsing never selects a lossy union branch.
export const customModuleSchema = z.discriminatedUnion('type', [
  customModuleBase.extend({ type: z.undefined().optional(), items: z.array(customSchema) }),
  customModuleBase.extend({ type: z.literal('summary'), items: z.array(summaryItemSchema) }),
  customModuleBase.extend({ type: z.literal('education'), items: z.array(educationSchema) }),
  customModuleBase.extend({ type: z.literal('experience'), items: z.array(experienceSchema) }),
  customModuleBase.extend({ type: z.literal('projects'), items: z.array(projectsSchema) }),
  customModuleBase.extend({ type: z.literal('skills'), items: z.array(skillsSchema) }),
  customModuleBase.extend({ type: z.literal('profiles'), items: z.array(contentItemSchemas.profiles) }),
  customModuleBase.extend({ type: z.literal('languages'), items: z.array(contentItemSchemas.languages) }),
  customModuleBase.extend({ type: z.literal('interests'), items: z.array(contentItemSchemas.interests) }),
  customModuleBase.extend({ type: z.literal('awards'), items: z.array(contentItemSchemas.awards) }),
  customModuleBase.extend({ type: z.literal('certifications'), items: z.array(contentItemSchemas.certifications) }),
  customModuleBase.extend({ type: z.literal('publications'), items: z.array(contentItemSchemas.publications) }),
  customModuleBase.extend({ type: z.literal('volunteer'), items: z.array(contentItemSchemas.volunteer) }),
  customModuleBase.extend({ type: z.literal('references'), items: z.array(contentItemSchemas.references) }),
]);

export type CustomModule = z.infer<typeof customModuleSchema>;
export type ResumeEntry = CustomModule['items'][number];

export type CustomModuleId = `custom-${string}`;
