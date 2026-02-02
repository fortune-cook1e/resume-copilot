'use client';

import { useEffect } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import ResumeDocument from '@/components/resume/ResumeDocument';
import { sampleResume } from '@/types/resume/sample';
import Page from '@/components/resume/Page';

export default function ResumePrintPage() {
  const { resume, setResume } = useResumeStore();

  useEffect(() => {
    if (!resume) {
      setResume(sampleResume);
    }
  }, [resume, setResume]);

  if (!resume) return null;

  return (
    <div className="bg-white mx-auto" style={{ width: '794px' }}>
      <Page>
        <ResumeDocument />
      </Page>
    </div>
  );
}
