import {
  experienceSchema,
  educationSchema,
  projectsSchema,
  customModuleSchema,
  type CustomModule,
} from '@/types/resume/modules';
import z from 'zod';

export const moduleSchema = z.object({
  name: z.string(),
  visible: z.boolean().default(true),
});

export const builtInModulesSchema = z.object({
  education: moduleSchema.extend({
    id: z.literal('education'),
    items: z.array(educationSchema),
  }),

  experience: moduleSchema.extend({
    id: z.literal('experience'),
    items: z.array(experienceSchema),
  }),

  projects: moduleSchema.extend({
    id: z.literal('projects'),
    items: z.array(projectsSchema),
  }),
});

export type Module = z.infer<typeof moduleSchema>;
export type BuiltInModules = z.infer<typeof builtInModulesSchema>;
export type Modules = BuiltInModules & Record<`custom-${string}`, CustomModule>;

export const modulesSchema: z.ZodType<Modules> = builtInModulesSchema.catchall(customModuleSchema);

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
  projects: {
    ...defaultModule,
    id: 'projects',
    visible: true,
    items: [],
  },
};

export * from './basics';
export * from './education';
export * from './experience';
export * from './projects';
export * from './custom';
