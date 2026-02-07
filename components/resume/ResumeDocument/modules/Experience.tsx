'use client';

import { useResumeStore } from '@/stores/resume-store';
import { renderMarkdown } from '@/lib/markdown';

const Experience = () => {
  const { resume } = useResumeStore();

  if (!resume) return null;

  const { experience } = resume.modules;

  if (!experience.visible || experience.items.length === 0) return null;

  const visibleItems = experience.items.filter(item => item.visible);

  if (visibleItems.length === 0) return null;

  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-resume-theme">{experience.name}</h2>

      <div className="space-y-3">
        {visibleItems.map(item => (
          <div key={item.id} className="space-y-1">
            <div className="flex justify-between gap-4">
              <div className="font-semibold text-base">{item.company}</div>
              <div className="text-sm flex-shrink-0">{item.date}</div>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <div>{item.position}</div>
              <div className="text-right text-gray-600 flex-shrink-0">{item.location}</div>
            </div>

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

export default Experience;
