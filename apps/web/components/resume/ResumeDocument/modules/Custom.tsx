'use client';

import { useResumeStore } from '@/stores/resume-store';
import type { CustomModule, CustomModuleId } from '@/types/resume';
import { renderMarkdown } from '@/lib/markdown';
import Link from './Link';

interface CustomProps {
  moduleId: CustomModuleId;
}

const Custom = ({ moduleId }: CustomProps) => {
  const { resume } = useResumeStore();

  if (!resume) return null;

  const module = resume.modules[moduleId] as CustomModule | undefined;
  if (!module || !module.visible || module.items.length === 0) return null;

  const visibleItems = module.items.filter(item => item.visible);
  if (!visibleItems.length) return null;

  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-resume-theme">{module.name}</h2>

      <div className="space-y-3">
        {visibleItems.map(item => (
          <div key={item.id} className="space-y-1">
            <div className="flex justify-between gap-4">
              <div className="font-semibold text-base">{item.name}</div>
              <div className="text-sm flex-shrink-0">{item.date}</div>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <div className="text-gray-700">{item.description}</div>
              <div className="text-right text-gray-600 flex-shrink-0">{item.location}</div>
            </div>

            {item.website.link && (
              <div className="text-sm text-resume-theme">
                <Link url={item.website} label={item.website.label || 'Link'} />
              </div>
            )}

            {item.summary && (
              <div
                className="text-sm text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(item.summary) }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Custom;
