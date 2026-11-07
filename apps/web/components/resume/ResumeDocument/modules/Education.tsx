'use client'

import { useResumeStore } from '@/stores/resume-store'
import { renderMarkdown } from '@/lib/markdown'
import PreviewBlock from '../PreviewBlock'
import SectionHeading from '../SectionHeading'
import EntryHeader from '../EntryHeader'

const Education = () => {
  const { resume } = useResumeStore()

  if (!resume) return null

  const { education } = resume.modules

  if (!education.visible || education.items.length === 0) return null

  const visibleItems = education.items.filter((item) => item.visible && item.university.trim())

  if (visibleItems.length === 0) return null

  return (
    <div className="space-y-1">
      <SectionHeading>{education.name}</SectionHeading>

      <div className="resume-entries">
        {visibleItems.map((item) => (
          <PreviewBlock
            key={item.id}
            sectionId="education"
            itemId={item.id}
            label={item.university || 'education'}
            className="space-y-1"
          >
            <EntryHeader
              inline={resume.design?.template === 'meowth'}
              title={item.university}
              subtitle={item.major}
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

export default Education
