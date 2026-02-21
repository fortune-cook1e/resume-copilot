'use client';

import { useEffect } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import ResumeDocument from '@/components/resume/ResumeDocument';
import { sampleResume } from '@/types/resume/sample';
import Page from '@/components/resume/Page';

// Todo: sample data needs to replaced by real data from server, but we need to make sure the data is loaded before rendering the document, otherwise it will cause hydration error since the document content is different between server and client. We can set a flag in the store to indicate whether the data is loaded or not, and only render the document when the data is loaded.
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
