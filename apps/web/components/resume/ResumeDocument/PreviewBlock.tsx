'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { EditorSelection, EditorSelectionProps } from '@/types/resume/editor'

export const PreviewSelectionContext = createContext<EditorSelectionProps | null>(null)

// Reuses the existing document div. With no editor context its print markup and
// classes remain unchanged, without controls, outlines or event handlers.
export default function PreviewBlock({
  sectionId,
  itemId,
  label,
  className,
  children,
}: EditorSelection & { label: string; className: string; children: ReactNode }) {
  const context = useContext(PreviewSelectionContext)
  if (!context?.onSelect) return <div className={className}>{children}</div>
  const selected = context.selection?.sectionId === sectionId && context.selection.itemId === itemId
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Edit ${label}`}
      aria-pressed={selected}
      className={`${className} resume-preview-block relative cursor-pointer rounded-sm outline-offset-4 hover:outline hover:outline-1 hover:outline-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${selected ? 'outline outline-2 outline-blue-500' : ''}`}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        context.onSelect?.({ sectionId, itemId })
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          context.onSelect?.({ sectionId, itemId })
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          context.onSelect?.(null)
        }
      }}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-5 right-0 rounded-t bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white"
        >
          Editing
        </span>
      )}
      {children}
    </div>
  )
}
