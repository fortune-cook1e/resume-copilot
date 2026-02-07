import { experienceSchema } from '@/types/resume';
import { educationSchema } from './education';
import z from 'zod';

export const moduleSchema = z.object({
  name: z.string(),
  visible: z.boolean().default(true),
});

export const modulesSchema = z.object({
  education: moduleSchema.extend({
    id: z.literal('education'),
    items: z.array(educationSchema),
  }),
  experience: moduleSchema.extend({
    id: z.literal('experience'),
    items: z.array(experienceSchema),
  }),
});

export type Module = z.infer<typeof moduleSchema>;
export type Modules = z.infer<typeof modulesSchema>;

export const defaultModule: Module = {
  name: '',
  visible: true,
};

export const defaultModules: Modules = {
  education: {
    ...defaultModule,
    id: 'education',
    visible: true,
    items: [],
  },
  experience: {
    ...defaultModule,
    id: 'experience',
    visible: true,
    items: [],
  },
};

export * from './basics';
export * from './education';
export * from './experience';
