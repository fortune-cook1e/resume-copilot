'use client'

import { useResumeStore } from '@/stores/resume-store'
import { renderMarkdown } from '@/lib/markdown'
import Link from './Link'
import PreviewBlock from '../PreviewBlock'
import EntryHeader from '../EntryHeader'

const Projects = () => {
  const { resume } = useResumeStore()

  if (!resume) return null

  const { projects } = resume.modules

  if (!projects.visible || projects.items.length === 0) return null

  const visibleItems = projects.items.filter((item) => item.visible && item.name.trim())

  if (visibleItems.length === 0) return null

  return (
    <div className="space-y-1">
      <h2 data-resume-heading className="font-semibold">
        {projects.name}
      </h2>

      <div className="space-y-2">
        {visibleItems.map((item) => (
          <PreviewBlock
            key={item.id}
            sectionId="projects"
            itemId={item.id}
            label={item.name || 'project'}
            className="space-y-1"
          >
            <EntryHeader title={item.name} subtitle={item.description} date={item.date} />
            {item.summary && (
              <div
                className="text-neutral-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(item.summary) }}
              />
            )}
            {item.website.link && (
              <Link url={item.website} label={item.website.label || 'Project'} />
            )}
          </PreviewBlock>
        ))}
      </div>
    </div>
  )
}

export default Projects
