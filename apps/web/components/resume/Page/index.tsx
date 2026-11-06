'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { EditorSelection, EditorSelectionProps } from '@/types/resume/editor'
import { paginate } from './paginate'

export default function Page({
  mode = 'preview',
  children,
  selection,
  onSelect,
}: EditorSelectionProps & {
  mode?: 'builder' | 'preview'
  children: ReactNode
}) {
  const sourceRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useLayoutEffect(() => {
    const source = sourceRef.current!
    const pages = pagesRef.current!
    let revision = 0
    let frame = 0
    let disposed = false
    const schedule = () => {
      const current = ++revision
      const documentElement = source.querySelector<HTMLElement>('#resume-document')
      if (!documentElement) return
      documentElement.dataset.ready = 'false'
      void (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (disposed || current !== revision) return
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => {
          if (disposed || current !== revision) return
          try {
            paginate(documentElement, pages)
            documentElement.dataset.ready = 'true'
            setFailed(false)
          } catch {
            pages.replaceChildren()
            setFailed(true)
          }
        })
      })
    }
    const observer = new MutationObserver(schedule)
    observer.observe(source, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-start-on-new-page', 'data-keep-together', 'style'],
    })
    document.fonts?.addEventListener('loadingdone', schedule)
    schedule()
    return () => {
      disposed = true
      observer.disconnect()
      document.fonts?.removeEventListener('loadingdone', schedule)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const pages = pagesRef.current!
    const decorate = () => {
      for (const block of pages.querySelectorAll<HTMLElement>('[data-preview-section]')) {
        if (!onSelect) {
          block.removeAttribute('role')
          block.removeAttribute('tabindex')
          block.removeAttribute('aria-label')
          block.removeAttribute('aria-pressed')
          block.classList.remove('resume-preview-block')
          continue
        }
        block.setAttribute('role', 'button')
        block.tabIndex = 0
        block.setAttribute('aria-label', `Edit ${block.dataset.previewLabel}`)
        const selected =
          selection?.sectionId === block.dataset.previewSection &&
          selection?.itemId === block.dataset.previewItem
        block.setAttribute('aria-pressed', String(selected))
        block.classList.add('resume-preview-block')
      }
    }
    const observer = new MutationObserver(decorate)
    observer.observe(pages, { childList: true })
    decorate()
    return () => observer.disconnect()
  }, [selection, onSelect])

  const select = (target: EventTarget | null) => {
    const block =
      target instanceof Element ? target.closest<HTMLElement>('[data-preview-section]') : null
    if (!onSelect || !block) return false
    onSelect({
      sectionId: block.dataset.previewSection as EditorSelection['sectionId'],
      itemId: block.dataset.previewItem,
    })
    return true
  }

  return (
    <>
      <div ref={sourceRef} className="resume-document-source" aria-hidden="true" inert>
        {children}
      </div>
      {failed && <p role="alert">Could not lay out this resume. Please try again.</p>}
      <div
        ref={pagesRef}
        className={`resume-pages ${mode === 'builder' ? 'resume-pages-builder' : ''}`}
        onClick={(event) => {
          if (select(event.target)) event.preventDefault()
        }}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && select(event.target))
            event.preventDefault()
          if (event.key === 'Escape' && onSelect) {
            onSelect(null)
            event.preventDefault()
          }
        }}
      />
    </>
  )
}
