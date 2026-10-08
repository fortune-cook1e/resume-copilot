'use client';

import { useResumeStore } from '@/stores/resume-store';
import Basics from './modules/Basics';
import Education from './modules/Education';
import Experience from './modules/Experience';
import Projects from './modules/Projects';
import Skills from './modules/Skills';
import Custom from './modules/Custom';
import Content from './modules/Content';
import { getSectionOrder } from '../ResumeEditor/sections';
import type { CustomModuleId } from '@/types/resume';
import type { EditorSelectionProps } from '@/types/resume/editor';
import { PreviewSelectionContext } from './PreviewBlock';

export default function ResumeDocument({ selection, onSelect }: EditorSelectionProps = {}) {
  const { resume } = useResumeStore();
  if (!resume) {
    return <div id="resume-document" data-ready="false" className="p-custom" />;
  }

  const builtins = { education: Education, experience: Experience, projects: Projects, skills: Skills };

  return (
    <PreviewSelectionContext.Provider value={onSelect ? { selection, onSelect } : null}>
      <div id="resume-document" data-ready="true" className="p-custom space-y-4">
        <Basics />
        {getSectionOrder(resume).map(sectionId => {
          if (sectionId in builtins) {
            const Component = builtins[sectionId as keyof typeof builtins];
            return <Component key={sectionId} />;
          }
          const section = resume.modules[sectionId];
          if (sectionId.startsWith('custom-') && section && !('type' in section && section.type)) return <Custom key={sectionId} moduleId={sectionId as CustomModuleId} />;
          return <Content key={sectionId} sectionId={sectionId} />;
        })}
      </div>
    </PreviewSelectionContext.Provider>
  );
}
