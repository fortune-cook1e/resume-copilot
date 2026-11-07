'use client'

import { useResumeStore } from '@/stores/resume-store'
import type { Custom, CustomModuleId } from '@resume-copilot/contracts'
import { renderMarkdown } from '@/lib/markdown'
import Link from './Link'
import PreviewBlock from '../PreviewBlock'
import SectionHeading from '../SectionHeading'
import EntryHeader from '../EntryHeader'

interface CustomProps {
  moduleId: CustomModuleId
}

const Custom = ({ moduleId }: CustomProps) => {
  const { resume } = useResumeStore()

  if (!resume) return null

  const customModule = resume.modules[moduleId]
  if (!customModule || !customModule.visible || customModule.items.length === 0) return null

  const visibleItems = (customModule.items as Custom[]).filter(
    (item) => item.visible && item.name.trim(),
  )
  if (!visibleItems.length) return null

  return (
    <div className="space-y-1">
      <SectionHeading>{customModule.name}</SectionHeading>

      <div className="resume-entries">
        {visibleItems.map((item) => (
          <PreviewBlock
            key={item.id}
            sectionId={moduleId}
            itemId={item.id}
            label={item.name || customModule.name}
            className="space-y-1"
          >
            <EntryHeader
              title={item.name}
              subtitle={item.description}
              date={item.date}
              location={item.location}
            />

            {item.website.link && (
              <div className="text-neutral-800">
                <Link url={item.website} label={item.website.label || 'Link'} />
              </div>
            )}

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

export default Custom
