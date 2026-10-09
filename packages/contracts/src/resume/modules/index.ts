import { experienceSchema } from './experience'
import { educationSchema } from './education'
import { projectsSchema } from './projects'
import { skillsSchema } from './skills'
import { customModuleSchema, type CustomModule } from './custom'
import { contentModuleSchemas } from './content'
import z from 'zod'

export const moduleSchema = z.object({
  name: z.string(),
  visible: z.boolean().default(true),
})

export const builtInModulesSchema = z.object({
  education: moduleSchema.extend({
    id: z.literal('education'),
    type: z.literal('education').optional(),
    items: z.array(educationSchema),
  }),

  experience: moduleSchema.extend({
    id: z.literal('experience'),
    type: z.literal('experience').optional(),
    items: z.array(experienceSchema),
  }),

  projects: moduleSchema.extend({
    id: z.literal('projects'),
    type: z.literal('projects').optional(),
    items: z.array(projectsSchema),
  }),

  skills: moduleSchema.extend({
    id: z.literal('skills'),
    type: z.literal('skills').optional(),
    items: z.array(skillsSchema),
  }),
})

export type Module = z.infer<typeof moduleSchema>
export type BuiltInModules = z.infer<typeof builtInModulesSchema>
const optionalModulesSchema = z.object(contentModuleSchemas).partial()
export type Modules = BuiltInModules &
  z.infer<typeof optionalModulesSchema> &
  Record<`custom-${string}`, CustomModule>

export const modulesSchema: z.ZodType<Modules> = builtInModulesSchema
  .extend(optionalModulesSchema.shape)
  .catchall(customModuleSchema)
  .superRefine((modules, context) => {
    for (const [key, module] of Object.entries(modules)) {
      if (module !== undefined && key !== module.id)
        context.addIssue({
          code: 'custom',
          path: [key, 'id'],
          message: 'Section ID must match its key',
        })
    }
  }) as z.ZodType<Modules>

export const defaultModule: Module = {
  name: '',
  visible: true,
}

export const defaultModules: Modules = {
  education: {
    ...defaultModule,
    name: 'Education',
    id: 'education',
    visible: true,
    items: [],
  },
  experience: {
    ...defaultModule,
    name: 'Experience',
    id: 'experience',
    visible: true,
    items: [],
  },
  projects: {
    ...defaultModule,
    name: 'Projects',
    id: 'projects',
    visible: true,
    items: [],
  },

  skills: {
    ...defaultModule,
    name: 'Skills',
    id: 'skills',
    visible: true,
    items: [],
  },
}

export * from './basics'
export * from './education'
export * from './experience'
export * from './projects'
export * from './custom'
export * from './skills'
export * from './content'
