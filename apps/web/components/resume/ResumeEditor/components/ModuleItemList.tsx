'use client'

import ItemActions from './ItemActions'
import { GripVertical } from 'lucide-react'
import { SortableItem, SortableList } from './SortableList'
import type { ReactNode } from 'react'

interface BaseItem {
  id: string
  visible: boolean
}
interface ModuleItemListProps<TItem extends BaseItem> {
  items: TItem[]
  getTitle: (item: TItem) => string
  getSubtitle?: (item: TItem) => string | undefined
  onEdit: (item: TItem) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleVisibility: (id: string) => void
  onReorder: (sourceId: string, targetId: string) => void
  selectedId?: string
  renderEditor?: (item: TItem) => ReactNode
}

export default function ModuleItemList<TItem extends BaseItem>({
  items,
  getTitle,
  getSubtitle,
  onEdit,
  onRemove,
  onDuplicate,
  onToggleVisibility,
  onReorder,
  selectedId,
  renderEditor,
}: ModuleItemListProps<TItem>) {
  return (
    <SortableList ids={items.map((item) => item.id)} onReorder={onReorder}>
      <div className="min-w-0 space-y-2">
        {items.map((item, index) => (
          <SortableItem
            key={item.id}
            id={item.id}
            className="group rounded-lg border border-stone-200 bg-background dark:border-stone-800"
          >
            {(handle) => (
              <>
                <div className="flex min-h-14 items-center gap-0.5 pr-1">
                  <button
                    type="button"
                    ref={handle.setActivatorNodeRef}
                    {...handle.attributes}
                    {...handle.listeners}
                    aria-label={'Reorder ' + getTitle(item)}
                    className="-ml-px flex h-10 w-5 shrink-0 touch-none cursor-grab items-center justify-center rounded text-stone-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 active:cursor-grabbing"
                  >
                    <GripVertical className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded py-2.5 pl-0.5 pr-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
                    aria-expanded={selectedId === item.id}
                    onClick={() => onEdit(item)}
                    onKeyDown={(event) => {
                      if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
                        event.preventDefault()
                        const target = items[index + (event.key === 'ArrowUp' ? -1 : 1)]
                        if (target) onReorder(item.id, target.id)
                      }
                    }}
                  >
                    <span className="block truncate text-[13px] font-semibold leading-[18px]">
                      {getTitle(item)}
                    </span>
                    {getSubtitle?.(item) && (
                      <span className="mt-0.5 block truncate text-xs leading-4 text-muted-foreground">
                        {getSubtitle(item)}
                      </span>
                    )}
                  </button>
                  {!item.visible && (
                    <span className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Hidden
                    </span>
                  )}
                  <ItemActions
                    isVisible={item.visible}
                    onToggleVisibility={() => onToggleVisibility(item.id)}
                    onEdit={() => onEdit(item)}
                    onRemove={() => onRemove(item.id)}
                    onDuplicate={() => onDuplicate(item.id)}
                  />
                </div>
                {selectedId === item.id && renderEditor?.(item)}
              </>
            )}
          </SortableItem>
        ))}
      </div>
    </SortableList>
  )
}
