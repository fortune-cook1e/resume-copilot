import { BadRequestException } from '@nestjs/common'
import {
  defaultSummary,
  type McpResumePatch,
  type ResumeData,
  type ResumeEntry,
} from '@resume-copilot/contracts'
import {
  createDraftEntry,
  createDraftSection,
  mergeBasics,
  mergeEntry,
  sectionEntryType,
  validateOrder,
} from './resume-draft'

type SectionId = keyof ResumeData['modules']

function findEntryIndex(items: { id: string }[], id: string) {
  const index = items.findIndex((item) => item.id === id)
  if (index < 0 || index !== items.findLastIndex((item) => item.id === id))
    throw new BadRequestException('Resume entry is missing or its ID is ambiguous.')
  return index
}

function findSection(modules: ResumeData['modules'], id: string) {
  const section = Object.hasOwn(modules, id) && modules[id as SectionId]
  if (!section) throw new BadRequestException('Resume section not found.')
  return section
}

export function applyResumeOperations(data: ResumeData, operations: McpResumePatch['operations']) {
  const modules = data.modules
  for (const operation of operations) {
    switch (operation.op) {
      case 'update_basics':
        data.basics = mergeBasics(data.basics, operation.changes)
        break
      case 'update_summary':
        modules.summary = { ...(modules.summary ?? defaultSummary), content: operation.text }
        break
      case 'update_entry': {
        const section = findSection(modules, operation.sectionId)
        const index = findEntryIndex(section.items, operation.entryId)
        const type = sectionEntryType(section.id, section.type)
        Object.assign(
          section.items[index],
          mergeEntry(type, section.items[index], operation.changes),
        )
        break
      }
      case 'add_entry': {
        const section = findSection(modules, operation.sectionId)
        const items: ResumeEntry[] = section.items
        const index =
          operation.beforeEntryId === undefined
            ? items.length
            : findEntryIndex(items, operation.beforeEntryId)
        const entry = createDraftEntry(sectionEntryType(section.id, section.type), operation.entry)
        items.splice(index, 0, entry as ResumeEntry)
        break
      }
      case 'remove_entry': {
        const { items } = findSection(modules, operation.sectionId)
        items.splice(findEntryIndex(items, operation.entryId), 1)
        break
      }
      case 'reorder_entries': {
        const items: ResumeEntry[] = findSection(modules, operation.sectionId).items
        const byId = new Map(items.map((item) => [item.id, item]))
        if (byId.size !== items.length)
          throw new BadRequestException('Resume entry IDs are ambiguous.')
        validateOrder(operation.entryIds, [...byId.keys()], true)
        items.splice(0, items.length, ...operation.entryIds.map((id) => byId.get(id)!))
        break
      }
      case 'add_section': {
        if (Object.hasOwn(modules, operation.sectionId))
          throw new BadRequestException('Resume section already exists.')
        const section = createDraftSection(operation.sectionId, operation.section)
        ;(modules as Record<string, unknown>)[operation.sectionId] = section
        break
      }
      case 'update_section':
        if (operation.changes.name !== undefined && !operation.changes.name.trim())
          throw new BadRequestException('Section name cannot be empty.')
        Object.assign(findSection(modules, operation.sectionId), operation.changes)
        break
      case 'clear_section': {
        const section = findSection(modules, operation.sectionId)
        section.items = []
        if ('content' in section) section.content = ''
        break
      }
      case 'remove_section': {
        const section = findSection(modules, operation.sectionId)
        if (!section.id.startsWith('custom-'))
          throw new BadRequestException('Use clear_section for built-in sections.')
        delete modules[section.id as `custom-${string}`]
        data.sectionOrder = data.sectionOrder?.filter((id) => id !== section.id)
        break
      }
      case 'reorder_sections':
        validateOrder(operation.sectionIds, Object.keys(modules), true)
        data.sectionOrder = operation.sectionIds
        break
      case 'update_design':
        if (operation.design === null) delete data.design
        else if (operation.design) data.design = { ...data.design, ...operation.design }
        if (operation.typography === null) delete data.typography
        else if (operation.typography) data.typography = operation.typography
        break
    }
  }
}
