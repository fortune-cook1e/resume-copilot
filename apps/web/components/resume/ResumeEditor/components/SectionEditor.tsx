'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Eye, EyeOff, GripVertical, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useResumeStore } from '@/stores/resume-store'
import type { ResumeEntry } from '@resume-copilot/contracts'
import type { EditorSelectionProps } from '@/types/resume/editor'
import ModuleHeader from './ModuleHeader'
import ModuleItemList from './ModuleItemList'
import EntryForm from './EntryForm'
import RichTextEditor from './RichTextEditor'
import { SortableItem } from './SortableList'
import {
  createEntry,
  entrySubtitle,
  entryTitle,
  getSectionType,
  sectionCatalog,
  type SectionId,
} from '../sections'

export default function SectionEditor({
  sectionId,
  selection,
  onSelect,
  onMove,
  canMoveUp,
  canMoveDown,
}: Required<EditorSelectionProps> & {
  sectionId: SectionId
  onMove: (direction: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const section = useResumeStore((state) => state.resume?.modules[sectionId])
  const ref = useRef<HTMLElement>(null)
  const [expanded, setExpanded] = useState(false)
  const selected = selection?.sectionId === sectionId
  const open = expanded || selected
  const selectedItemId = selected ? selection?.itemId : undefined
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [selected, selectedItemId])
  if (!section) return null
  const type = getSectionType(sectionId, section)
  const summary = sectionId === 'summary'
  const update = useResumeStore.getState().updateResume
  const addEntry = () => {
    const item = createEntry(type)
    update((draft) => {
      const target = draft.modules[sectionId]!
      target.items = [...target.items, item] as typeof target.items
    })
    setExpanded(true)
    onSelect({ sectionId, itemId: item.id })
  }
  const toggle = () => {
    setExpanded(!open)
    if (selected) onSelect(null)
  }
  const reorder = (source: string, target: string) =>
    update((draft) => {
      const section = draft.modules[sectionId]!
      const items = [...section.items]
      const from = items.findIndex((item) => item.id === source),
        to = items.findIndex((item) => item.id === target)
      if (from < 0 || to < 0 || from === to) return
      const [item] = items.splice(from, 1)
      items.splice(to, 0, item)
      section.items = items as typeof section.items
    })
  return (
    <SortableItem id={sectionId}>
      {(handle) => (
        <section
          ref={ref}
          aria-label={section.name + ' section'}
          className="scroll-mt-4 rounded-lg"
        >
          <div className="flex h-11 items-center gap-0.5 rounded-lg pr-1 hover:bg-stone-100 dark:hover:bg-stone-800">
            <button
              type="button"
              ref={handle.setActivatorNodeRef}
              {...handle.attributes}
              {...handle.listeners}
              aria-label={'Reorder ' + section.name}
              className="flex h-11 w-7 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-stone-400 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-ring"
            >
              <GripVertical className="size-3.5" />
            </button>
            <button
              type="button"
              aria-expanded={open}
              className={
                'min-w-0 flex-1 truncate rounded-md py-1 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring ' +
                (!section.visible ? 'text-muted-foreground line-through' : '')
              }
              onClick={toggle}
              onKeyDown={(event) => {
                if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
                  event.preventDefault()
                  onMove(event.key === 'ArrowUp' ? -1 : 1)
                }
              }}
            >
              {section.name}
            </button>
            {!summary && (
              <span className="mr-1 min-w-3 text-center font-mono text-xs text-stone-400">
                {section.items.length}
                <span className="sr-only"> entries</span>
              </span>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-stone-400"
              aria-label={(section.visible ? 'Hide ' : 'Show ') + section.name}
              aria-pressed={!section.visible}
              onClick={() =>
                update((draft) => {
                  draft.modules[sectionId]!.visible = !section.visible
                })
              }
            >
              {section.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-stone-400"
              aria-label={'Toggle ' + section.name}
              aria-expanded={open}
              onClick={toggle}
            >
              <ChevronDown
                className={
                  'size-3.5 transition-transform motion-reduce:transition-none ' +
                  (open ? 'rotate-180' : '')
                }
              />
            </Button>
            <ModuleHeader
              moduleId={sectionId}
              onAdd={summary ? undefined : addEntry}
              onMove={onMove}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
            />
          </div>
          {open && (
            <div className="grid gap-2 pb-3 pl-[26px] pt-1">
              {summary ? (
                <RichTextEditor
                  value={'content' in section ? (section.content ?? '') : ''}
                  onChange={(content) =>
                    update((draft) => {
                      const target = draft.modules.summary
                      if (target) target.content = content
                    })
                  }
                />
              ) : (
                <>
                  <ModuleItemList
                    items={section.items as ResumeEntry[]}
                    getTitle={(item) => entryTitle(item, type)}
                    getSubtitle={(item) => entrySubtitle(item, type)}
                    selectedId={selectedItemId}
                    renderEditor={(item) => (
                      <EntryForm key={item.id} sectionId={sectionId} itemId={item.id} />
                    )}
                    onEdit={(item) => {
                      setExpanded(true)
                      onSelect({
                        sectionId,
                        itemId: selectedItemId === item.id ? undefined : item.id,
                      })
                    }}
                    onRemove={(id) => {
                      update((draft) => {
                        const target = draft.modules[sectionId]!
                        target.items = target.items.filter(
                          (item) => item.id !== id,
                        ) as typeof target.items
                      })
                      if (selectedItemId === id) onSelect({ sectionId })
                    }}
                    onDuplicate={(id) => {
                      const source = section.items.find((item) => item.id === id)
                      if (!source) return
                      const copy = { ...structuredClone(source), id: createEntry(type).id }
                      update((draft) => {
                        const target = draft.modules[sectionId]!
                        const index = target.items.findIndex((item) => item.id === id)
                        target.items = [
                          ...target.items.slice(0, index + 1),
                          copy,
                          ...target.items.slice(index + 1),
                        ] as typeof target.items
                      })
                      onSelect({ sectionId, itemId: copy.id })
                    }}
                    onToggleVisibility={(id) =>
                      update((draft) => {
                        const item = draft.modules[sectionId]!.items.find((item) => item.id === id)
                        if (item) item.visible = !item.visible
                      })
                    }
                    onReorder={reorder}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-fit justify-start gap-1.5 px-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                    onClick={addEntry}
                  >
                    <Plus className="size-3.5" />
                    Add {type === 'custom' ? 'entry' : sectionCatalog[type].singular}
                  </Button>
                </>
              )}
            </div>
          )}
        </section>
      )}
    </SortableItem>
  )
}
