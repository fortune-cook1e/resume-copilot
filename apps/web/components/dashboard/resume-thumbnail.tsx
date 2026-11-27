import { createRoot } from 'react-dom/client'
import type { Resume } from '@resume-copilot/contracts'
import ResumeDocument from '@/components/resume/ResumeDocument'
import {
  createPdfDocument,
  embedPdfIcons,
  type PdfResult,
} from '@/components/resume/ResumeBuilder/pdf/document'

let queue: Promise<unknown> = Promise.resolve()

// Bound peak memory: only one document is laid out and rasterized at a time.
export function enqueueThumbnail<T>(render: () => Promise<T>, signal: AbortSignal): Promise<T> {
  const next = queue.then(() => {
    signal.throwIfAborted()
    return render()
  })
  queue = next.catch(() => {})
  return next
}

export async function renderThumbnail(resume: Resume, parentSignal: AbortSignal): Promise<string> {
  const signal = AbortSignal.any([parentSignal, AbortSignal.timeout(30000)])
  signal.throwIfAborted()
  const container = document.createElement('div')
  container.className = 'resume-document-source !visible text-[#171717]'
  container.setAttribute('aria-hidden', 'true')
  container.inert = true
  document.body.append(container)
  const root = createRoot(container)
  let worker: Worker | undefined
  try {
    const source = await new Promise<HTMLElement>((resolve, reject) => {
      const onAbort = () => reject(signal.reason)
      signal.addEventListener('abort', onAbort, { once: true })
      root.render(
        <div
          ref={(element) => {
            const source = element?.querySelector<HTMLElement>('.resume-typography')
            if (source) {
              signal.removeEventListener('abort', onAbort)
              resolve(source)
            }
          }}
        >
          <ResumeDocument
            sourceId={`thumbnail-${resume.id}`}
            data={{
              resume: resume.data,
              avatar: resume.avatar ?? null,
            }}
          />
        </div>,
      )
    })
    signal.throwIfAborted()
    const { document: pdfDocument } = createPdfDocument(source)
    await Promise.all(pdfDocument.children.map(embedPdfIcons))
    signal.throwIfAborted()
    worker = new Worker(new URL('../resume/ResumeBuilder/pdf/render.worker.ts', import.meta.url))
    const renderer = worker
    const bytes = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
      const cleanup = () => {
        signal.removeEventListener('abort', onAbort)
        renderer.removeEventListener('message', onMessage)
        renderer.removeEventListener('error', onError)
      }
      const onAbort = () => {
        cleanup()
        reject(signal.reason)
      }
      const onError = () => {
        cleanup()
        reject(new Error('Could not render resume cover.'))
      }
      const onMessage = ({ data }: MessageEvent<PdfResult & { failed?: boolean }>) => {
        if (data.failed) onError()
        else {
          cleanup()
          resolve(data.bytes)
        }
      }
      signal.addEventListener('abort', onAbort, { once: true })
      renderer.addEventListener('message', onMessage)
      renderer.addEventListener('error', onError)
      renderer.postMessage({ id: 1, document: pdfDocument })
    })
    signal.throwIfAborted()
    return await firstPageImage(bytes, signal)
  } finally {
    worker?.terminate()
    root.unmount()
    container.remove()
  }
}

async function firstPageImage(bytes: Uint8Array<ArrayBuffer>, signal: AbortSignal) {
  const { getDocument, PDFWorker } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  signal.throwIfAborted()
  const port = new Worker(new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url), {
    type: 'module',
  })
  const worker = PDFWorker.create({ port })
  const task = getDocument({ data: bytes, worker })
  const onAbort = () => {
    void task.destroy()
  }
  signal.addEventListener('abort', onAbort, { once: true })
  const canvas = document.createElement('canvas')
  try {
    const pdf = await task.promise
    signal.throwIfAborted()
    const page = await pdf.getPage(1)
    // A bounded 840px cover stays sharp at desktop card widths and high-DPI mobile sizes.
    const viewport = page.getViewport({ scale: 840 / page.getViewport({ scale: 1 }).width })
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const render = page.render({ canvas, viewport })
    const cancel = () => render.cancel()
    signal.addEventListener('abort', cancel, { once: true })
    try {
      await render.promise
      signal.throwIfAborted()
      return canvas.toDataURL('image/webp', 0.9)
    } finally {
      signal.removeEventListener('abort', cancel)
      page.cleanup()
    }
  } finally {
    signal.removeEventListener('abort', onAbort)
    await task.destroy()
    worker.destroy()
    port.terminate()
    canvas.width = canvas.height = 0
  }
}
