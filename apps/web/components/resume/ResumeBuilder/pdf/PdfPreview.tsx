'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFPageProxy, PDFWorker } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import type { EditorSelectionProps } from '@/types/resume/editor'
import type { ResumePdf } from './use-resume-pdf'

const PX_PER_POINT = 4 / 3

type PageData = { page: PDFPageProxy; text: string }

function PdfPage({
  data,
  number,
  pdf,
  selection,
  onSelect,
}: EditorSelectionProps & { data: PageData; number: number; pdf: ResumePdf }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState<PageData | null>(null)
  useEffect(() => {
    const element = canvas.current!
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const element = canvas.current!
    const viewport = data.page.getViewport({ scale: PX_PER_POINT })
    const resolution = Math.min(window.devicePixelRatio, 2)
    element.width = Math.ceil(viewport.width * resolution)
    element.height = Math.ceil(viewport.height * resolution)
    const task = data.page.render({
      canvas: element,
      viewport,
      transform: [resolution, 0, 0, resolution, 0, 0],
    })
    let disposed = false
    void task.promise.catch(() => {
      if (!disposed) setFailed(data)
    })
    return () => {
      disposed = true
      task.cancel()
      element.width = 0
      element.height = 0
    }
  }, [data, visible])

  return (
    <section aria-label={`Page ${number}`} className="resume-page relative !p-0">
      <canvas ref={canvas} width={0} height={0} className="block size-full" aria-hidden="true" />
      <span className="sr-only">{data.text}</span>
      {failed === data && <p role="alert">Could not display this PDF page.</p>}
      {onSelect &&
        pdf.boxes[number - 1]?.map((box) => {
          const target = pdf.targets[box.target]
          if (!target) return null
          const { sectionId, itemId, label } = target
          return (
            <Button
              key={box.target}
              type="button"
              variant="ghost"
              className="resume-preview-block absolute rounded-sm p-0 hover:bg-transparent dark:hover:bg-transparent"
              aria-label={`Edit ${label}`}
              aria-pressed={selection?.sectionId === sectionId && selection.itemId === itemId}
              data-preview-section={sectionId}
              data-preview-item={itemId}
              style={{
                left: box.x * PX_PER_POINT,
                top: box.y * PX_PER_POINT,
                width: box.width * PX_PER_POINT,
                height: box.height * PX_PER_POINT,
              }}
              onClick={() => onSelect({ sectionId, itemId })}
            />
          )
        })}
    </section>
  )
}

export default function PdfPreview({
  pdf,
  selection,
  onSelect,
}: EditorSelectionProps & { pdf: ResumePdf }) {
  const [rendered, setRendered] = useState<{ pdf: ResumePdf; pages: PageData[] } | null>(null)
  const [failed, setFailed] = useState<ResumePdf | null>(null)
  const viewer = useRef<{ worker: PDFWorker; port: Worker } | null>(null)

  useEffect(
    () => () => {
      viewer.current?.worker.destroy()
      viewer.current?.port.terminate()
      viewer.current = null
    },
    [],
  )

  useEffect(() => {
    let disposed = false
    let dispose: (() => void) | undefined
    // The compatible build polyfills APIs used to decode embedded fonts.
    void import('pdfjs-dist/legacy/build/pdf.mjs')
      .then(async ({ getDocument, PDFWorker }) => {
        if (disposed) return
        if (!viewer.current) {
          const port = new Worker(
            new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url),
          )
          viewer.current = { worker: PDFWorker.create({ port }), port }
        }
        const loading = getDocument({
          data: pdf.bytes.slice(),
          worker: viewer.current.worker,
        })
        dispose = () => {
          void loading.destroy().catch(() => {})
        }
        const document = await loading.promise
        const pages = await Promise.all(
          Array.from({ length: document.numPages }, async (_, index) => {
            const page = await document.getPage(index + 1)
            const text = (await page.getTextContent()).items
              .map((item) => ('str' in item ? item.str : ''))
              .join(' ')
            return { page, text }
          }),
        )
        if (!disposed) {
          setRendered({ pdf, pages })
        }
      })
      .catch(() => {
        if (!disposed) setFailed(pdf)
      })
    return () => {
      disposed = true
      dispose?.()
    }
  }, [pdf])

  if (failed === pdf) return <p role="alert">Could not display the PDF preview.</p>
  if (!rendered) return null
  return (
    <div
      className="resume-pages resume-pages-builder"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onSelect?.(null)
      }}
    >
      {rendered.pages.map((page, index) => (
        <PdfPage
          key={index}
          data={page}
          number={index + 1}
          pdf={rendered.pdf}
          selection={selection}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
