'use client';

import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/stores/resume-store';
import Basics from './modules/Basics';
import Education from './modules/Education';
import Experience from './modules/Experience';
import Projects from './modules/Projects';
import Custom from './modules/Custom';
import Skills from './modules/Skills';
import type { CustomModule, CustomModuleId } from '@/types/resume';

export default function ResumeEditor() {
  const { resume, updateResume } = useResumeStore();

  if (!resume) return null;

  const isCustomModuleId = (key: string): key is CustomModuleId => key.startsWith('custom-');

  const activateCustomModule = () => {
    const existingCustom = Object.keys(resume.modules).filter(isCustomModuleId);
    const nextIndex = existingCustom.length + 1;
    const moduleId = `custom-${nextIndex}` as CustomModuleId;
    const nextName = moduleId;
    updateResume(draft => {
      draft.modules[moduleId] = {
        id: moduleId,
        name: nextName,
        visible: true,
        items: [],
      } as CustomModule;
    });
  };

  return (
    <div className="p-6 space-y-8">
      <section className="space-y-4">
        <div className="text-lg font-semibold text-gray-900">Basics</div>
        <Basics />
      </section>

      <Education />

      <Projects />

      <Experience />

      <Skills />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-900">Custom Module</div>
          <Button type="button" variant="outline" size="sm" onClick={activateCustomModule}>
            Add Custom Module
          </Button>
        </div>
        {Object.keys(resume.modules).some(isCustomModuleId) ? (
          <div className="space-y-6">
            {Object.keys(resume.modules)
              .filter(isCustomModuleId)
              .map(key => (
                <Custom key={key} moduleId={key} />
              ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
            Add a custom module to include additional sections.
          </div>
        )}
      </section>
    </div>
  );
}
