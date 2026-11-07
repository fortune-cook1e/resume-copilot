'use client'

import { useResumeStore } from '@/stores/resume-store'
import { renderMarkdown } from '@/lib/markdown'
import PreviewBlock from '../PreviewBlock'
import SectionHeading from '../SectionHeading'
import EntryHeader from '../EntryHeader'

const Experience = () => {
  const { resume } = useResumeStore()

  if (!resume) return null

  const { experience } = resume.modules

  if (!experience.visible || experience.items.length === 0) return null

  const visibleItems = experience.items.filter((item) => item.visible && item.company.trim())

  if (visibleItems.length === 0) return null

  return (
    <div className="space-y-1">
      <SectionHeading>{experience.name}</SectionHeading>

      <div className="resume-entries">
        {visibleItems.map((item) => (
          <PreviewBlock
            key={item.id}
            sectionId="experience"
            itemId={item.id}
            label={item.company || 'experience'}
            className="space-y-1"
          >
            <EntryHeader
              inline={resume.design?.template === 'meowth'}
              title={item.company}
              subtitle={item.position}
              date={item.date}
              location={item.location}
            />

            {item.summary && (
              <div
                className="text-neutral-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(item.summary) }}
              />
            )}
          </PreviewBlock>
        ))}
      </div>
    </div>
  )
}

export default Experience
