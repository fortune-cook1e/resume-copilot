'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Download, Eye, LoaderCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/stores/resume-store';
import { exportResumePDF } from '@/services/resume';

type Action = 'back' | 'preview' | 'export' | 'retry';

export default function BuilderToolbar({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  const title = useResumeStore(state => state.title);
  const saveStatus = useResumeStore(state => state.saveStatus);
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const perform = async (action: Action) => {
    if (busyRef.current) return;
    const before = useResumeStore.getState();
    if (!before.resumeId || !before.resume) return;
    const resumeId = before.resumeId;
    // Open in the user gesture; opening only after an async save triggers popup blockers.
    const preview = action === 'preview' ? window.open('about:blank', '_blank') : null;
    if (action === 'preview' && !preview) {
      setError('Allow popups to open the print preview.');
      return;
    }
    if (preview) preview.opener = null;

    busyRef.current = true;
    setBusy(action);
    onBusyChange(true);
    setError(null);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const saved = !before.isDirty && !before.isSaving ? true : await Promise.race([
        before.saveToServer(),
        new Promise<boolean>(resolve => { timeout = setTimeout(() => resolve(false), 10000); }),
      ]);
      if (!mounted.current || useResumeStore.getState().resumeId !== resumeId) {
        preview?.close();
        return;
      }
      if (!saved) {
        preview?.close();
        setError(useResumeStore.getState().isSaving
          ? 'Saving is taking longer than expected. Your changes are still open.'
          : 'Your changes could not be saved. Retry before leaving or downloading.');
        return;
      }

      if (action === 'back') router.push('/dashboard/resumes');
      if (action === 'preview') preview?.location.replace(`/resume/print?id=${encodeURIComponent(resumeId)}`);
      if (action === 'export') {
        const latest = useResumeStore.getState();
        const filename = latest.resume?.basics.name || latest.title || 'Resume';
        const blob = await exportResumePDF(filename, resumeId);
        if (!mounted.current || useResumeStore.getState().resumeId !== resumeId) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        try {
          link.href = url;
          link.download = `${filename}.pdf`;
          document.body.appendChild(link);
          link.click();
        } finally {
          link.remove();
          URL.revokeObjectURL(url);
        }
      }
    } catch {
      preview?.close();
      if (mounted.current) setError('PDF export failed. Please try again.');
    } finally {
      if (timeout) clearTimeout(timeout);
      busyRef.current = false;
      if (mounted.current) {
        setBusy(null);
        onBusyChange(false);
      }
    }
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Back to resumes" disabled={!!busy} onClick={() => void perform('back')}>
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <Button
              variant="ghost" size="sm" className="h-7 max-w-[42vw] justify-start gap-1 px-1 font-semibold sm:max-w-72"
              aria-label="Rename resume" disabled={!!busy}
              onClick={() => { setDraftTitle(title); setRenaming(true); }}
            >
              <span className="truncate">{title || 'Untitled Resume'}</span><ChevronDown className="size-3 text-muted-foreground" />
            </Button>
            <div className="flex min-h-5 items-center gap-1.5 px-1 text-xs text-muted-foreground" role="status" aria-live="polite">
              {saveStatus === 'saving' ? <LoaderCircle className="size-3 animate-spin" /> : saveStatus === 'saved' ? <Check className="size-3" /> : null}
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'pending' ? 'Unsaved changes' : 'Not saved'}
              {saveStatus === 'error' ? <button type="button" className="underline underline-offset-2" disabled={!!busy} onClick={() => void perform('retry')}>Retry</button> : null}
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium lg:flex"><Pencil className="size-4" />Write</div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Print preview" disabled={!!busy} onClick={() => void perform('preview')}><Eye /></Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700" aria-label="Download PDF" disabled={!!busy} onClick={() => void perform('export')}>
            {busy === 'export' ? <LoaderCircle className="animate-spin" /> : <Download />}
            <span className="hidden sm:inline">{busy === 'export' ? 'Preparing…' : 'Download PDF'}</span>
          </Button>
        </div>
      </header>
      {error ? <div role="alert" className="border-b border-destructive/20 bg-destructive/5 px-5 py-3 text-sm text-destructive">{error}</div> : null}
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename resume</DialogTitle><DialogDescription>This name appears in your resume list.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={event => {
            event.preventDefault();
            if (!draftTitle.trim()) return;
            useResumeStore.getState().updateTitle(draftTitle);
            setRenaming(false);
          }}>
            <div className="space-y-2"><Label htmlFor="resume-title">Resume name</Label><Input id="resume-title" value={draftTitle} onChange={event => setDraftTitle(event.target.value)} maxLength={20} required autoFocus /></div>
            <p className="text-xs text-muted-foreground">Up to 20 characters.</p>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setRenaming(false)}>Cancel</Button><Button type="submit" disabled={!draftTitle.trim()}>Save name</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
