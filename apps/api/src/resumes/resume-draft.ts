import { BadRequestException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  defaultModules,
  defaultResumeEntries,
  defaultSummary,
  defaultUrl,
  mcpResumeEntryChangesSchema,
  sectionTypeSchema,
  type Basics,
  type mcpResumeBasicsChangesSchema,
  type mcpResumeDraftSectionSchema,
} from '@resume-copilot/contracts'
import type { z } from 'zod'

type EntryType = keyof typeof defaultResumeEntries

export function mergeBasics(
  basics: Basics,
  changes?: z.infer<typeof mcpResumeBasicsChangesSchema>,
) {
  if (!changes) return basics
  const { website, picture, customFields, ...fields } = changes
  return {
    ...basics,
    ...fields,
    website: { ...basics.website, ...website },
    picture: { ...basics.picture, ...picture },
    customFields: customFields?.map((link) => ({ ...defaultUrl, ...link })) ?? basics.customFields,
  }
}

export function sectionEntryType(id: string, type?: string): EntryType {
  const builtIn = sectionTypeSchema.safeParse(id)
  if (builtIn.success && (type === undefined || type === id)) return builtIn.data
  if (/^custom-.+/.test(id)) {
    if (type === undefined) return 'custom'
    const parsed = sectionTypeSchema.safeParse(type)
    if (parsed.success) return parsed.data
  }
  throw new BadRequestException('Invalid resume section ID or type.')
}

export function mergeEntry(
  type: EntryType,
  entry: Record<string, unknown>,
  changes: Record<string, unknown>,
) {
  const parsed = mcpResumeEntryChangesSchema(type).safeParse(changes)
  if (!parsed.success) throw new BadRequestException(`Invalid fields for a ${type} entry.`)
  const { website, ...fields } = parsed.data
  return {
    ...entry,
    ...fields,
    ...(website && typeof website === 'object'
      ? { website: { ...defaultUrl, ...(entry.website as object), ...website } }
      : {}),
  }
}

export function createDraftEntry(type: EntryType, fields: Record<string, unknown>) {
  return { ...mergeEntry(type, defaultResumeEntries[type], fields), id: randomUUID() }
}

export function createDraftSection(id: string, draft: z.infer<typeof mcpResumeDraftSectionSchema>) {
  const { type, items = [], content, ...settings } = draft
  const entryType = sectionEntryType(id, type)
  const custom = id.startsWith('custom-')
  if (content !== undefined && id !== 'summary')
    throw new BadRequestException('Section content belongs in Summary or in entries.')
  if (custom && !settings.name?.trim())
    throw new BadRequestException('A custom section needs a name.')
  const standard = defaultModules[id as keyof typeof defaultModules]
  return {
    ...standard,
    ...(id === 'summary' ? { content: content ?? defaultSummary.content } : {}),
    id,
    name: id[0].toUpperCase() + id.slice(1),
    visible: true,
    ...settings,
    ...(type ? { type } : {}),
    items: items.map((fields) => createDraftEntry(entryType, fields)),
  }
}

export function validateOrder(order: string[], ids: string[], complete = false) {
  if (
    new Set(order).size !== order.length ||
    order.some((id) => !ids.includes(id)) ||
    (complete && order.length !== ids.length)
  )
    throw new BadRequestException('Order must contain valid, unique IDs.')
}
