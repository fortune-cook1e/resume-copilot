'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ResizableHandle, ResizablePanel, ResizableGroup } from '@/components/ui/resizable';
import ResumeEditor from '@/components/resume/ResumeEditor';
import { useResumeStore } from '@/stores/resume-store';
import { useDefaultLayout } from 'react-resizable-panels';
import ResumeBuilder from '@/components/resume/ResumeBuilder';
import { getResume } from '@/services/resume';
import type { ResumeData } from '@/types/resume';

// create a safe storage that works in SSR
const createSafeStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return localStorage;
};

export default function ResumePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resumeId = searchParams.get('id');

  const { resume, setResume, setResumeId, reset } = useResumeStore();
  const [loadError, setLoadError] = useState<string | null>(null);

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'unique-layout-id',
    storage: createSafeStorage(),
  });

  // Load resume data from API
  useEffect(() => {
    if (!resumeId) {
      router.replace('/dashboard/resumes');
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const detail = await getResume(resumeId);
        if (cancelled) return;
        setResumeId(detail.id);
        setResume(detail.data as ResumeData);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load resume:', error);
        setLoadError('Failed to load resume');
      }
    };

    reset();
    load();

    return () => {
      cancelled = true;
    };
  }, [resumeId, router, setResume, setResumeId, reset]);

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{loadError}</p>
          <button
            className="text-sm text-primary underline"
            onClick={() => router.push('/dashboard/resumes')}
          >
            Back to resumes
          </button>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <main className="flex-1 overflow-hidden">
        <ResizableGroup defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
          <ResizablePanel id="left" minSize={400} maxSize={500}>
            <div className="h-full bg-white border-r border-gray-200">
              <div className="h-full overflow-y-auto">
                <ResumeEditor />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel id="right" minSize={500}>
            <ResumeBuilder />
          </ResizablePanel>
        </ResizableGroup>
      </main>
    </div>
  );
}
