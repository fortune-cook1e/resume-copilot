'use client';

import { useResumeStore } from '@/stores/resume-store';
import { renderMarkdown } from '@/lib/markdown';
import Link from './Link';
import PreviewBlock from '../PreviewBlock';

const Projects = () => {
  const { resume } = useResumeStore();

  if (!resume) return null;

  const { projects } = resume.modules;

  if (!projects.visible || projects.items.length === 0) return null;

  const visibleItems = projects.items.filter(item => item.visible && item.name.trim());

  if (visibleItems.length === 0) return null;

  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-resume-theme">{projects.name}</h2>

      <div className="space-y-3">
        {visibleItems.map(item => (
          <PreviewBlock key={item.id} sectionId="projects" itemId={item.id} label={item.name || 'project'} className="space-y-1">
            <div className="flex justify-between gap-4">
              <div className="font-semibold text-base">{item.name}</div>
              <div className="text-sm flex-shrink-0">{item.date}</div>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <div className="text-gray-700">{item.description}</div>
              {item.website && (
                <div className="text-right text-resume-theme flex-shrink-0">
                  <Link url={item.website} label={item.website.label || 'Project'} />
                </div>
              )}
            </div>

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

export default Projects;
