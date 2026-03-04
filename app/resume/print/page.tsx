'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useResumeStore } from '@/stores/resume-store';
import ResumeDocument from '@/components/resume/ResumeDocument';
import Page from '@/components/resume/Page';
import { ResumeData } from '@/types';
import { getResume } from '@/services/resume';

declare global {
  interface Window {
    __RESUME_DATA__?: { id: string; data: ResumeData; isPrint?: boolean };
  }
}

function ResumePrintContent() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get('id');
  const { resume, setResume, setResumeId } = useResumeStore();

  useEffect(() => {
    const injected = window.__RESUME_DATA__;
    if (injected && injected.isPrint) {
      setResumeId(injected.id);
      setResume(injected.data);
      return;
    }

    if (!resumeId) {
      return;
    }

    getResume(resumeId)
      .then(res => {
        setResumeId(res.id);
        setResume(res.data);
      })
      .catch(err => {
        console.error('Failed to load resume for print:', err);
      });
  }, [resumeId, setResume, setResumeId]);

  if (!resume) return null;

  return (
    <div className="bg-white mx-auto w-198.5">
      <Page>
        <ResumeDocument />
      </Page>
    </div>
  );
}

export default function ResumePrintPage() {
  return (
    <Suspense>
      <ResumePrintContent />
    </Suspense>
  );
}
