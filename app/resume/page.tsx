'use client';

import { useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizableGroup } from '@/components/ui/resizable';
import ResumeEditor from '@/components/resume/ResumeEditor';
import ResumePreview from '@/components/resume/ResumePreview';
import { useResumeStore } from '@/stores/resume-store';
import { INITIAL_SAMPLE_RESUME } from '@/app/resume/sample';
import { useDefaultLayout } from 'react-resizable-panels';

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

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'unique-layout-id',
    storage: createSafeStorage(),
  });

  // Initialize resume data
  useEffect(() => {
    if (!resume) {
      setResume(INITIAL_SAMPLE_RESUME);
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
      {/* <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Resume Copilot</h1>
          <p className="text-sm text-gray-600 mt-1">从LinkedIn导入，创建专业简历</p>
        </div>
      </header> */}

      <main className="flex-1 overflow-hidden">
        <ResizableGroup defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
          <ResizablePanel id="left" minSize={50}>
            <div className="h-full bg-white border-r border-gray-200">
              <div className="h-full overflow-y-auto">
                <ResumeEditor />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel id="right" minSize={50}>
            <div className="h-full bg-gray-100">
              <div className="h-full overflow-y-auto">
                <ResumePreview />
              </div>
            </div>
          </ResizablePanel>
        </ResizableGroup>
      </main>
    </div>
  );
}
