'use client';

import { useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizableGroup } from '@/components/ui/resizable';
import ResumeEditor from '@/components/resume/ResumeEditor';
import ResumePreview from '@/components/resume/ResumeDocument';
import { useResumeStore } from '@/stores/resume-store';
import { useDefaultLayout } from 'react-resizable-panels';
import { sampleResume } from '@/types/resume/sample';
import ResumeBuilder from '@/components/resume/ResumeBuilder';
import { useSession } from '@/lib/auth-client';

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
  const { resume, setResume } = useResumeStore();
  const { data: session } = useSession();
  const { user } = session || {};

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'unique-layout-id',
    storage: createSafeStorage(),
  });

  // Initialize resume data
  useEffect(() => {
    if (!resume) {
      setResume(sampleResume);
    }
  }, [resume, setResume]);

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
