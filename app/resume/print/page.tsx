'use client';

import { useEffect } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import { INITIAL_SAMPLE_RESUME } from '@/app/resume/sample';
import ResumeDocument from '@/components/resume/ResumeDocument';

export default function ResumePrintPage() {
  const { resume, setResume } = useResumeStore();

  useEffect(() => {
    if (!resume) {
      setResume(INITIAL_SAMPLE_RESUME);
    }
  }, [resume, setResume]);

  if (!resume) return null;

  return <ResumeDocument resume={resume} />;
}
