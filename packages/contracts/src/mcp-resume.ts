import { z } from 'zod'
import {
  basicsSchema,
  contentItemSchemas,
  createResumeSchema,
  customSchema,
  educationSchema,
  experienceSchema,
  idSchema,
  projectsSchema,
  resumeDataSchema,
  resumeVersionSchema,
  resumeVisibilitySchema,
  skillsSchema,
  sectionTypeSchema,
  summaryItemSchema,
  urlSchema,
} from './resume'

const experienceFields = experienceSchema.pick({
  company: true,
  position: true,
  date: true,
  summary: true,
})
const projectFields = projectsSchema.pick({
  name: true,
  description: true,
  date: true,
  summary: true,
})
const educationFields = educationSchema.pick({
  university: true,
  major: true,
  date: true,
  summary: true,
})
const skillFields = skillsSchema.pick({ name: true, level: true, keywords: true })

export const mcpResumeFields = {
  experience: experienceFields.keyof(),
  projects: projectFields.keyof(),
  education: educationFields.keyof(),
  skills: skillFields.keyof(),
}

function entrySelection<T extends z.ZodType>(field: T) {
  return z.strictObject({
    fields: z.array(field).min(1).max(16).optional(),
    entryIds: z.array(idSchema.max(256)).min(1).max(100).optional(),
  })
}

const sectionSelection = z
  .strictObject({
    summary: z.literal(true),
    experience: entrySelection(mcpResumeFields.experience),
    projects: entrySelection(mcpResumeFields.projects),
    education: entrySelection(mcpResumeFields.education),
    skills: entrySelection(mcpResumeFields.skills),
  })
  .partial()

export const mcpResumeReadInputSchema = z.strictObject({
  resumeId: z.uuid(),
  sections: sectionSelection.optional(),
})

export const mcpResumeReadResultSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  version: resumeVersionSchema,
  description: z.string().optional(),
  visibility: resumeVisibilitySchema.optional(),
  // The read handler validates this document with resumeDataSchema. The editor
  // accepts legacy sections whose optional discriminant cannot be exported as JSON Schema.
  data: z.looseObject({}).describe('Complete resume document in the editor format.').optional(),
  sections: z
    .strictObject({
      summary: z.strictObject({
        content: z.string(),
        items: z.array(summaryItemSchema.pick({ id: true, summary: true }).strict()),
      }),
      experience: z.array(experienceFields.partial().extend({ id: idSchema }).strict()),
      projects: z.array(projectFields.partial().extend({ id: idSchema }).strict()),
      education: z.array(educationFields.partial().extend({ id: idSchema }).strict()),
      skills: z.array(skillFields.partial().extend({ id: idSchema }).strict()),
    })
    .partial()
    .optional(),
})

const draftLinkSchema = urlSchema.extend({ icon: urlSchema.shape.icon.unwrap() }).partial().strict()

export const mcpResumeBasicsChangesSchema = basicsSchema
  .extend({
    website: draftLinkSchema,
    picture: basicsSchema.shape.picture
      .extend({ size: basicsSchema.shape.picture.shape.size.unwrap() })
      .partial()
      .strict(),
    customFields: z.array(draftLinkSchema),
  })
  .partial()
  .strict()

const entrySchemas = {
  ...contentItemSchemas,
  education: educationSchema,
  experience: experienceSchema,
  projects: projectsSchema,
  skills: skillsSchema,
  summary: summaryItemSchema,
  custom: customSchema,
}

export function mcpResumeEntryChangesSchema(type: keyof typeof entrySchemas) {
  const { id: _id, ...fields } = entrySchemas[type].shape
  const optionalFields = Object.fromEntries(
    Object.entries(fields).map(([key, schema]) => [
      key,
      (key === 'website'
        ? draftLinkSchema
        : schema instanceof z.ZodDefault
          ? schema.unwrap()
          : schema
      ).optional(),
    ]),
  )
  return z.strictObject(optionalFields)
}

const entryChanges = z.looseObject({}).describe(
  'Fields depend on the section type. Never supply an entry ID here. ' +
    Object.entries(entrySchemas)
      .map(
        ([type, schema]) =>
          `${type}: ${Object.keys(schema.shape)
            .filter((key) => key !== 'id')
            .join(', ')}`,
      )
      .join('; '),
)

const sectionSettings = z
  .strictObject({
    name: z.string(),
    visible: z.boolean(),
    startOnNewPage: z.boolean(),
    keepTogether: z.boolean(),
    content: z.string().describe('Text for the built-in Summary section.'),
  })
  .partial()

export const mcpResumeDraftSectionSchema = sectionSettings.extend({
  type: sectionTypeSchema
    .optional()
    .describe('For a custom section, set the entry type or omit for general entries.'),
  items: z.array(entryChanges).max(100).optional(),
})

const sectionOrder = z.array(z.string())
const draftDesign = resumeDataSchema.shape.design.unwrap().strict()
const [presetTypography, customTypography] = resumeDataSchema.shape.typography.unwrap().options
const draftTypography = z.union([
  presetTypography.strict(),
  customTypography
    .extend({
      heading: customTypography.shape.heading.unwrap().strict().optional(),
      body: customTypography.shape.body.unwrap().strict().optional(),
    })
    .strict(),
])

const requestKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/)
  .describe('Use a unique key per new resume. Reuse the same key when retrying this exact request.')
const resumeTitle = createResumeSchema.shape.title.unwrap().min(1)

export const mcpResumeCreateInputSchema = z.strictObject({
  requestKey: requestKeySchema,
  title: resumeTitle,
  description: createResumeSchema.shape.description,
  data: z
    .strictObject({
      basics: mcpResumeBasicsChangesSchema.optional(),
      modules: z
        .record(z.string(), mcpResumeDraftSectionSchema)
        .optional()
        .describe(
          'Sections keyed by built-in ID (summary, profiles, experience, education, projects, skills, languages, interests, awards, certifications, publications, volunteer, references) or by custom-* ID.',
        ),
      sectionOrder: sectionOrder.optional(),
      design: draftDesign.optional(),
      typography: draftTypography.optional(),
      summary: z.string().optional(),
      experience: z
        .array(experienceSchema.omit({ id: true, visible: true }).partial().strict())
        .max(100)
        .optional(),
      projects: z
        .array(
          projectsSchema
            .omit({ id: true, visible: true })
            .extend({ website: draftLinkSchema })
            .partial()
            .strict(),
        )
        .max(100)
        .optional(),
      education: z
        .array(educationSchema.omit({ id: true, visible: true }).partial().strict())
        .max(100)
        .optional(),
      skills: z
        .array(skillsSchema.omit({ id: true, visible: true }).partial().strict())
        .max(100)
        .optional(),
    })
    .optional(),
})

export const mcpResumeCreateResultSchema = mcpResumeReadResultSchema
  .omit({ data: true, sections: true, description: true, visibility: true })
  .extend({ editorUrl: z.url() })

const entryId = idSchema.min(1).max(256)

export const mcpResumeUpdateInputSchema = z.strictObject({
  resumeId: z.uuid(),
  version: resumeVersionSchema,
  target: z.discriminatedUnion('section', [
    z.strictObject({ section: z.literal('summary') }),
    z.strictObject({ section: z.literal('experience'), entryId }),
    z.strictObject({
      section: z.literal('projects'),
      entryId,
      field: z.enum(['description', 'summary']),
    }),
  ]),
  text: z.string().max(64 * 1024),
})

export const mcpResumeUpdateResultSchema = mcpResumeCreateResultSchema.omit({ title: true })
export type McpResumeUpdate = z.infer<typeof mcpResumeUpdateInputSchema>

const patchOperation = z.discriminatedUnion('op', [
  z.strictObject({ op: z.literal('update_basics'), changes: mcpResumeBasicsChangesSchema }),
  z.strictObject({ op: z.literal('update_summary'), text: z.string() }),
  z.strictObject({
    op: z.literal('update_entry'),
    sectionId: entryId,
    entryId,
    changes: entryChanges,
  }),
  z.strictObject({
    op: z.literal('add_entry'),
    sectionId: entryId,
    entry: entryChanges,
    beforeEntryId: entryId.optional(),
  }),
  z.strictObject({ op: z.literal('remove_entry'), sectionId: entryId, entryId }),
  z.strictObject({
    op: z.literal('reorder_entries'),
    sectionId: entryId,
    entryIds: z
      .array(entryId)
      .describe('All current entry IDs in the new order, including hidden entries.'),
  }),
  z.strictObject({
    op: z.literal('add_section'),
    sectionId: entryId,
    section: mcpResumeDraftSectionSchema,
  }),
  z.strictObject({
    op: z.literal('update_section'),
    sectionId: entryId,
    changes: sectionSettings.omit({ content: true }),
  }),
  z.strictObject({ op: z.literal('clear_section'), sectionId: entryId }),
  z.strictObject({
    op: z.literal('remove_section'),
    sectionId: entryId.describe('Custom section ID. Use clear_section for a built-in section.'),
  }),
  z.strictObject({
    op: z.literal('reorder_sections'),
    sectionIds: z
      .array(entryId)
      .describe('All current section IDs in the new order, including hidden sections.'),
  }),
  z.strictObject({
    op: z.literal('update_design'),
    design: draftDesign
      .nullable()
      .optional()
      .describe('Merge supplied design fields, or pass null to restore design defaults.'),
    typography: draftTypography
      .nullable()
      .optional()
      .describe('Replace typography settings, or pass null to restore typography defaults.'),
  }),
])

export const mcpResumePatchInputSchema = z.strictObject({
  resumeId: z.uuid(),
  version: resumeVersionSchema,
  operations: z.array(patchOperation).min(1).max(100),
})
export type McpResumePatch = z.infer<typeof mcpResumePatchInputSchema>

export const mcpResumeDeleteInputSchema = z.strictObject({
  resumeId: z.uuid(),
  version: resumeVersionSchema,
})

export const mcpResumeMetadataInputSchema = mcpResumeDeleteInputSchema.extend({
  changes: z
    .strictObject({
      title: resumeTitle.optional(),
      description: z
        .string()
        .max(64 * 1024)
        .optional(),
      visibility: resumeVisibilitySchema.optional(),
    })
    .refine((changes) => Object.keys(changes).length > 0, 'Specify at least one resume property.'),
})

export const mcpResumeMetadataResultSchema = mcpResumeCreateResultSchema.extend({
  description: z.string(),
  visibility: resumeVisibilitySchema,
})

export const mcpResumeDuplicateInputSchema = mcpResumeDeleteInputSchema.extend({
  requestKey: requestKeySchema,
  title: resumeTitle.describe('Title of the new private copy.'),
})
export type McpResumeDuplicate = z.infer<typeof mcpResumeDuplicateInputSchema>
