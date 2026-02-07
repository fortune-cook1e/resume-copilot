'use client';

import { useResumeStore } from '@/stores/resume-store';
import { renderMarkdown } from '@/lib/markdown';

const Education = () => {
  const { resume } = useResumeStore();

  if (!resume) return null;

  const { education } = resume.modules;

  if (!education.visible || education.items.length === 0) return null;

  const visibleItems = education.items.filter(item => item.visible);

  if (visibleItems.length === 0) return null;

  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-resume-theme">{education.name}</h2>

      <div className="space-y-3">
        {visibleItems.map(item => (
          <div key={item.id} className="flex justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-base">{item.university}</div>
              <div className="text-sm">{item.major}</div>
              {item.summary && (
                <div
                  className="text-sm text-gray-600 mt-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(item.summary) }}
                />
              )}
            </div>

            <div className="text-right text-sm flex-shrink-0 space-y-1">
              <div>{item.date}</div>
              <div className="text-gray-600">{item.location}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Education;
