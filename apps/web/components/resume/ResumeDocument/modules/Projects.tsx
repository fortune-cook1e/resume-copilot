'use client'

import { useResumeStore } from '@/stores/resume-store'
import { renderMarkdown } from '@/lib/markdown'
import Link, { projectWebsiteHref } from './Link'
import PreviewBlock from '../PreviewBlock'
import SectionHeading from '../SectionHeading'
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
      <SectionHeading>{projects.name}</SectionHeading>

      <div className="resume-entries">
        {visibleItems.map((item) => {
          const href = projectWebsiteHref(item.website.link)
          const titleHref = item.website.inlineLink ? href : undefined
          return (
            <PreviewBlock
              key={item.id}
              sectionId="projects"
              itemId={item.id}
              label={item.name || 'project'}
              className="space-y-1"
            >
              <EntryHeader
                title={item.name}
                titleHref={titleHref}
                subtitle={item.description}
                date={item.date}
              />
              {item.summary && (
                <div
                  className="text-neutral-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(item.summary) }}
                />
              )}
              {href && !titleHref && (
                <Link
                  url={{ ...item.website, link: href }}
                  label={item.website.label || 'Project'}
                  projectLink
                />
              )}
            </PreviewBlock>
          )
        })}
      </div>
    </div>
  )
}

export default Projects
