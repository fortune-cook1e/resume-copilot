'use client';

import { useResumeStore } from '@/stores/resume-store';
import Basics from './modules/Basics';
import Education from './modules/Education';
import Experience from './modules/Experience';
import Projects from './modules/Projects';
import Custom from './modules/Custom';
import type { CustomModuleId } from '@/types/resume';

export default function ResumeDocument() {
  const { resume } = useResumeStore();
  if (!resume) return null;

  const isCustomModuleId = (key: string): key is CustomModuleId => key.startsWith('custom-');

  return (
    <div id="resume-document" className="p-custom space-y-4">
      <Basics />
      <Education />
      <Projects />
      <Experience />
      {Object.keys(resume.modules)
        .filter(isCustomModuleId)
        .map(key => (
          <Custom key={key} moduleId={key} />
        ))}
    </div>
  );
}
