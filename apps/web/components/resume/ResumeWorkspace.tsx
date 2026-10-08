'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, LoaderCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ResumeEditor from '@/components/resume/ResumeEditor';
import ResumeBuilder from '@/components/resume/ResumeBuilder';
import BuilderToolbar from '@/components/resume/BuilderToolbar';
import { useResumeStore } from '@/stores/resume-store';
import { getResume } from '@/services/resume';
import type { EditorSelection } from '@/types/resume/editor';

export default function ResumeWorkspace({ resumeId }: { resumeId: string }) {
  const router = useRouter();
  const loadedId = useResumeStore(state => state.resumeId);
  const isReady = useResumeStore(state => state.isReady);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mobileView, setMobileView] = useState<'write' | 'page'>('write');
  const [actionBusy, setActionBusy] = useState(false);
  const [selection, setSelection] = useState<EditorSelection | null>(null);

  useEffect(() => {
    let cancelled = false;
    useResumeStore.getState().reset();
    void getResume(resumeId).then(detail => {
      if (!cancelled) useResumeStore.getState().initializeResume(detail);
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    });
    return () => {
      cancelled = true;
      if (useResumeStore.getState().resumeId === resumeId) useResumeStore.getState().reset();
    };
  }, [resumeId, attempt]);

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (!useResumeStore.getState().isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => window.removeEventListener('beforeunload', warnUnsaved);
  }, []);

  if (loadError) {
    return (
      <main className="flex h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert">Could not open this resume. It may be unavailable, or the connection failed.</p>
        <div className="flex gap-2">
          <Button onClick={() => { setLoadError(false); setAttempt(value => value + 1); }}>Try again</Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/resumes')}>Back to resumes</Button>
        </div>
      </main>
    );
  }
  if (!isReady || loadedId !== resumeId) {
    return <main role="status" className="flex h-svh items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading resume…</main>;
  }

  return (
    <div className="flex h-svh min-w-0 flex-col overflow-hidden bg-background">
      <a href="#builder-content" className="sr-only z-50 rounded-md bg-background p-3 focus:not-sr-only focus:absolute">Skip to resume content</a>
      <BuilderToolbar onBusyChange={setActionBusy} />
      <main className="grid min-h-0 flex-1 lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside
          id="builder-content" aria-label="Resume content" tabIndex={-1}
          className={`min-h-0 overflow-y-auto border-r bg-stone-50/60 dark:bg-stone-950 ${mobileView === 'write' ? 'block' : 'hidden'} lg:block`}
        >
          <div inert={actionBusy || undefined} aria-busy={actionBusy}><ResumeEditor selection={selection} onSelect={setSelection} /></div>
        </aside>
        <section
          aria-label="Resume preview"
          className={`relative min-h-0 min-w-0 overflow-hidden bg-slate-100 ${mobileView === 'page' ? 'block' : 'hidden'} lg:block`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-4 z-10 text-center text-xs font-medium text-slate-500">A4 · Live preview</div>
          <ResumeBuilder selection={selection} onSelect={actionBusy ? undefined : next => { setSelection(next); if (next) setMobileView('write'); }} />
        </section>
      </main>
      <nav aria-label="Editor view" className="flex shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
        <button type="button" aria-pressed={mobileView === 'write'} className={`flex h-14 flex-1 items-center justify-center gap-2 text-sm ${mobileView === 'write' ? 'font-semibold text-blue-600' : 'text-muted-foreground'}`} onClick={() => setMobileView('write')}><Pencil className="size-4" />Write</button>
        <button type="button" aria-pressed={mobileView === 'page'} className={`flex h-14 flex-1 items-center justify-center gap-2 text-sm ${mobileView === 'page' ? 'font-semibold text-blue-600' : 'text-muted-foreground'}`} onClick={() => setMobileView('page')}><FileText className="size-4" />Page</button>
      </nav>
    </div>
  );
}
