'use client';

import { useResumeStore } from '@/stores/resume-store';
import type { Custom, CustomModuleId } from '@resume-copilot/contracts';
import { renderMarkdown } from '@/lib/markdown';
import Link from './Link';
import PreviewBlock from '../PreviewBlock';

interface CustomProps {
  moduleId: CustomModuleId;
}

const Custom = ({ moduleId }: CustomProps) => {
  const { resume } = useResumeStore();

  if (!resume) return null;

  const customModule = resume.modules[moduleId];
  if (!customModule || !customModule.visible || customModule.items.length === 0) return null;

  const visibleItems = (customModule.items as Custom[]).filter(item => item.visible && item.name.trim());
  if (!visibleItems.length) return null;

  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-resume-theme">{customModule.name}</h2>

      <div className="space-y-3">
        {visibleItems.map(item => (
          <PreviewBlock key={item.id} sectionId={moduleId} itemId={item.id} label={item.name || customModule.name} className="space-y-1">
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
          </PreviewBlock>
        ))}
      </div>
    </div>
  );
};

export default Custom;
