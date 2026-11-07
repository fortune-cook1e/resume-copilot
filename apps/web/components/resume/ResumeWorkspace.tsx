'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, LoaderCircle, Palette, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ResumeEditor from '@/components/resume/ResumeEditor'
import ResumeBuilder from '@/components/resume/ResumeBuilder'
import ResumeDocument from '@/components/resume/ResumeDocument'
import ResumeDesign from '@/components/resume/ResumeDesign'
import BuilderToolbar from '@/components/resume/BuilderToolbar'
import { useResumeStore } from '@/stores/resume-store'
import { exportResumePDF, getResume } from '@/services/resume'
import type { EditorSelection } from '@/types/resume/editor'
import { useResumePdf } from './ResumeBuilder/pdf/use-resume-pdf'

// Matches Tailwind's lg breakpoint, where both panes are visible.
const desktopPreviewQuery = '(min-width: 64rem)'
function subscribeDesktopPreview(onChange: () => void) {
  const query = window.matchMedia(desktopPreviewQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const desktopPreview = () => window.matchMedia(desktopPreviewQuery).matches

export default function ResumeWorkspace({ resumeId }: { resumeId: string }) {
  const router = useRouter()
  const loadedId = useResumeStore((state) => state.resumeId)
  const isReady = useResumeStore((state) => state.isReady)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [mobileView, setMobileView] = useState<'write' | 'page'>('write')
  const [editorMode, setEditorMode] = useState<'write' | 'design'>('write')
  const [actionBusy, setActionBusy] = useState(false)
  const [selection, setSelection] = useState<EditorSelection | null>(null)
  const isDesktop = useSyncExternalStore(subscribeDesktopPreview, desktopPreview, () => false)
  const previewVisible = isDesktop || mobileView === 'page'
  const {
    sourceRef,
    preview: pdf,
    error: pdfFailed,
    render: renderPdf,
  } = useResumePdf(isReady && loadedId === resumeId ? resumeId : null, previewVisible)

  useEffect(() => {
    let cancelled = false
    useResumeStore.getState().reset()
    void getResume(resumeId)
      .then((detail) => {
        if (!cancelled) useResumeStore.getState().initializeResume(detail)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
      if (useResumeStore.getState().resumeId === resumeId) useResumeStore.getState().reset()
    }
  }, [resumeId, attempt])

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (!useResumeStore.getState().isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnUnsaved)
    return () => window.removeEventListener('beforeunload', warnUnsaved)
  }, [])

  if (loadError) {
    return (
      <main className="flex h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert">
          Could not open this resume. It may be unavailable, or the connection failed.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setLoadError(false)
              setAttempt((value) => value + 1)
            }}
          >
            Try again
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/resumes')}>
            Back to resumes
          </Button>
        </div>
      </main>
    )
  }
  if (!isReady || loadedId !== resumeId) {
    return (
      <main
        role="status"
        className="flex h-svh items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <LoaderCircle className="size-4 animate-spin" />
        Loading resume…
      </main>
    )
  }

  return (
    <Tabs
      value={editorMode}
      onValueChange={(mode) => {
        if (mode === 'write' || mode === 'design') setEditorMode(mode)
        if (!isDesktop) setMobileView('write')
      }}
      className="h-svh min-w-0 gap-0 overflow-hidden bg-background"
    >
      <a
        href="#builder-content"
        className="sr-only z-50 rounded-md bg-background p-3 focus:not-sr-only focus:absolute"
      >
        Skip to resume content
      </a>
      <div
        ref={sourceRef}
        className="resume-document-source !visible text-[#171717]"
        aria-hidden="true"
        inert
      >
        <ResumeDocument sourceId="resume-pdf-source" />
      </div>
      <BuilderToolbar
        onBusyChange={setActionBusy}
        editorTabs={
          <TabsList aria-label="Resume editor mode" className="shrink-0">
            <TabsTrigger value="write" aria-label="Write" disabled={actionBusy}>
              <Pencil />
              <span className="hidden sm:inline">Write</span>
            </TabsTrigger>
            <TabsTrigger value="design" aria-label="Design" disabled={actionBusy}>
              <Palette />
              <span className="hidden sm:inline">Design</span>
            </TabsTrigger>
          </TabsList>
        }
        getPdf={async (revision, filename, id, action) => {
          try {
            const result = await renderPdf(revision)
            return new Blob([result.bytes], { type: 'application/pdf' })
          } catch (error) {
            const current = useResumeStore.getState()
            if (current.resumeId !== id || current.resume !== revision) throw error
            if (action === 'preview') return null
            return exportResumePDF(filename, id)
          }
        }}
      />
      <main className="grid min-h-0 flex-1 lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside
          id="builder-content"
          aria-label="Resume content"
          tabIndex={-1}
          className={`min-h-0 overflow-y-auto border-r bg-stone-50/60 dark:bg-stone-950 ${mobileView === 'write' ? 'block' : 'hidden'} lg:block`}
        >
          <div inert={actionBusy || undefined} aria-busy={actionBusy}>
            <TabsContent value="write">
              <ResumeEditor selection={selection} onSelect={setSelection} />
            </TabsContent>
            <TabsContent value="design">
              <ResumeDesign />
            </TabsContent>
          </div>
        </aside>
        <section
          aria-label="Resume preview"
          className={`relative min-h-0 min-w-0 overflow-hidden bg-slate-100 ${mobileView === 'page' ? 'block' : 'hidden'} lg:block`}
        >
          <ResumeBuilder
            previewVisible={previewVisible}
            pdf={pdf}
            pdfFailed={pdfFailed}
            selection={selection}
            onSelect={
              actionBusy
                ? undefined
                : (next) => {
                    setSelection(next)
                    if (next) {
                      setEditorMode('write')
                      setMobileView('write')
                    }
                  }
            }
          />
        </section>
      </main>
      <nav
        aria-label="Editor view"
        className="flex shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <Button
          variant="ghost"
          type="button"
          aria-pressed={mobileView === 'write'}
          className={`h-14 flex-1 rounded-none ${mobileView === 'write' ? 'font-semibold text-blue-600' : 'text-muted-foreground'}`}
          onClick={() => setMobileView('write')}
        >
          {editorMode === 'design' ? <Palette className="size-4" /> : <Pencil className="size-4" />}
          {editorMode === 'design' ? 'Design' : 'Write'}
        </Button>
        <Button
          variant="ghost"
          type="button"
          aria-pressed={mobileView === 'page'}
          className={`h-14 flex-1 rounded-none ${mobileView === 'page' ? 'font-semibold text-blue-600' : 'text-muted-foreground'}`}
          onClick={() => setMobileView('page')}
        >
          <FileText className="size-4" />
          Page
        </Button>
      </nav>
    </Tabs>
  )
}
