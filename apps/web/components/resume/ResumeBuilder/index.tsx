'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useResumeStore } from '@/stores/resume-store'
import ResumeDocument from '../ResumeDocument'
import Controls from './Controls'
import Page from '@/components/resume/Page'
import { MM_TO_PX, PAGE_SIZE_MAP } from '@/constants'
import type { EditorSelectionProps } from '@/types/resume/editor'

const documentContent = <ResumeDocument />

function fitScale(viewport: HTMLElement) {
  const fit = Math.min(
    1,
    (viewport.clientWidth - 48) / (PAGE_SIZE_MAP.a4.width * MM_TO_PX),
    (viewport.clientHeight - 120) / (PAGE_SIZE_MAP.a4.height * MM_TO_PX),
  )
  return Math.max(0.2, Math.floor(fit * 100) / 100)
}

export default function ResumeBuilder({ selection, onSelect }: EditorSelectionProps = {}) {
  const isReady = useResumeStore((state) => state.isReady)
  const viewportRef = useRef<HTMLDivElement>(null)
  const documentRef = useRef<HTMLDivElement>(null)
  const fitted = useRef(false)
  const [scale, setScale] = useState(0.6)
  const [size, setSize] = useState({
    width: PAGE_SIZE_MAP.a4.width * MM_TO_PX,
    height: PAGE_SIZE_MAP.a4.height * MM_TO_PX,
  })

  useLayoutEffect(() => {
    if (!isReady) return
    const viewport = viewportRef.current!
    const document = documentRef.current!
    const measure = () => {
      const width = document.offsetWidth
      const height = document.offsetHeight
      if (width && height) {
        setSize((previous) =>
          previous.width === width && previous.height === height ? previous : { width, height },
        )
      }
      if (!fitted.current && viewport.clientWidth && viewport.clientHeight) {
        setScale(fitScale(viewport))
        fitted.current = true
      }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(document)
    measure()
    return () => observer.disconnect()
  }, [isReady])

  if (!isReady) return null

  return (
    <div className="relative h-full">
      <div ref={viewportRef} className="h-full overflow-auto overscroll-contain px-6 pb-24 pt-6">
        {/* Reserve the scaled size so native scrolling reaches every page.
            The document itself keeps A4 layout geometry at every zoom level. */}
        <div className="mx-auto" style={{ width: size.width * scale, height: size.height * scale }}>
          <div
            ref={documentRef}
            style={{
              width: '210mm',
              display: 'flow-root',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <Page mode="builder" selection={selection} onSelect={onSelect}>
              {documentContent}
            </Page>
          </div>
        </div>
      </div>
      <Controls
        scale={scale}
        onFit={() => {
          const viewport = viewportRef.current
          if (!viewport?.clientWidth || !viewport.clientHeight) return
          setScale(fitScale(viewport))
          viewport.scrollTo(0, 0)
        }}
        onChange={(next) => setScale(Math.max(0.2, Math.min(2.5, Math.round(next * 100) / 100)))}
      />
    </div>
  )
}
