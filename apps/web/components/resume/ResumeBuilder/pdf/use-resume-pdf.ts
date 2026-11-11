import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ResumeData } from '@resume-copilot/contracts'
import { useResumeStore } from '@/stores/resume-store'
import { createPdfDocument, embedPdfIcons, type PdfResult, type PreviewTarget } from './document'

export type ResumePdf = PdfResult & { targets: PreviewTarget[] }
type Job = {
  revision: ResumeData
  avatar: string | null
  result: Promise<ResumePdf>
  cancel: () => void
}
const failed = new Error('Could not generate the resume PDF.')

export function useResumePdf(resumeId: string | null, previewVisible: boolean) {
  const resume = useResumeStore((state) => state.resume)
  const avatar = useResumeStore((state) => state.avatar)
  const sourceRef = useRef<HTMLDivElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const jobRef = useRef<Job | null>(null)
  const nextId = useRef(0)
  const committed = useRef({ resume, avatar })
  const [view, setView] = useState<{ resumeId: string; pdf: ResumePdf | null } | null>(null)

  useLayoutEffect(() => {
    committed.current = { resume: resumeId ? resume : null, avatar }
    return () => {
      committed.current = { resume: null, avatar: null }
    }
  }, [resumeId, resume, avatar])

  const render = useCallback(async (revision: ResumeData): Promise<ResumePdf> => {
    const id = useResumeStore.getState().resumeId
    const photo = useResumeStore.getState().avatar
    const isCurrent = () =>
      committed.current.resume === revision &&
      committed.current.avatar === photo &&
      useResumeStore.getState().avatar === photo
    if (!isCurrent()) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (!id || !isCurrent()) throw failed
    const active = jobRef.current
    if (active && (active.revision !== revision || active.avatar !== photo))
      await active.result.catch(() => {})
    if (!isCurrent()) throw failed
    if (jobRef.current?.revision === revision && jobRef.current.avatar === photo)
      return jobRef.current.result
    const source = sourceRef.current?.firstElementChild
    if (!(source instanceof HTMLElement)) throw failed

    let job: Job | undefined
    try {
      const { document, targets } = createPdfDocument(source)
      const worker =
        workerRef.current ??
        (workerRef.current = new Worker(new URL('./render.worker.ts', import.meta.url)))
      const jobId = ++nextId.current
      let cancel = () => {}
      const result = new Promise<ResumePdf>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timeout)
          worker.removeEventListener('message', onMessage)
          worker.removeEventListener('error', onError)
        }
        cancel = () => {
          cleanup()
          reject(failed)
        }
        const onMessage = ({
          data,
        }: MessageEvent<PdfResult & { id: number; failed?: boolean }>) => {
          if (data.id !== jobId) return
          cleanup()
          if (data.failed) reject(failed)
          else
            resolve({
              bytes: data.bytes,
              boxes: data.boxes,
              projectLinks: data.projectLinks,
              targets,
            })
        }
        const onError = () => {
          cleanup()
          worker.terminate()
          if (workerRef.current === worker) workerRef.current = null
          reject(failed)
        }
        const timeout = setTimeout(onError, 15000)
        worker.addEventListener('message', onMessage)
        worker.addEventListener('error', onError)
        void Promise.all(document.children.map(embedPdfIcons))
          .then(() => {
            if (jobRef.current?.result === result) worker.postMessage({ id: jobId, document })
          })
          .catch(() => {
            cleanup()
            reject(failed)
          })
      })
      job = { revision, avatar: photo, result, cancel }
      jobRef.current = job
      const pdf = await result
      if (isCurrent()) setView({ resumeId: id, pdf })
      return pdf
    } catch (cause) {
      if (jobRef.current === job) jobRef.current = null
      if (isCurrent()) setView({ resumeId: id, pdf: null })
      throw cause
    }
  }, [])

  useEffect(() => {
    if (!resumeId || !resume || !previewVisible) return
    const timer = setTimeout(() => void render(resume).catch(() => {}), 180)
    return () => clearTimeout(timer)
  }, [resumeId, resume, avatar, previewVisible, render])

  useEffect(() => {
    if (!resumeId) return
    return () => {
      jobRef.current?.cancel()
      jobRef.current = null
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [resumeId])

  const current = view?.resumeId === resumeId ? view : null
  return { sourceRef, preview: current?.pdf ?? null, error: current?.pdf === null, render }
}
