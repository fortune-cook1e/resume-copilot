'use client';

import { useResumeStore } from '@/stores/resume-store';
import Basics from './modules/Basics';
import Education from './modules/Education';
import Experience from './modules/Experience';
import Projects from './modules/Projects';
import Skills from './modules/Skills';
import Custom from './modules/Custom';
import type { CustomModuleId } from '@/types/resume';

export default function ResumeDocument() {
  const { resume } = useResumeStore();
  if (!resume) {
    return <div id="resume-document" data-ready="false" className="p-custom" />;
  }

  const isCustomModuleId = (key: string): key is CustomModuleId => key.startsWith('custom-');

  return (
    <div id="resume-document" data-ready="true" className="p-custom space-y-4">
      <Basics />
      <Education />
      <Projects />
      <Skills />
      <Experience />
      {Object.keys(resume.modules)
        .filter(isCustomModuleId)
        .map(key => (
          <Custom key={key} moduleId={key} />
        ))}
    </div>
  );
}
