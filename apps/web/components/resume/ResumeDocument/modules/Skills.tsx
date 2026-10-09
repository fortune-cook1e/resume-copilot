'use client'

import { Badge } from '@/components/ui/badge'
import { useResumeStore } from '@/stores/resume-store'
import PreviewBlock from '../PreviewBlock'

const Skills = () => {
  const { resume } = useResumeStore()

  if (!resume) return null

  const { skills } = resume.modules

  if (!skills.visible || skills.items.length === 0) return null

  const visibleItems = skills.items.filter((item) => item.visible && item.name.trim())

  if (visibleItems.length === 0) return null

  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-resume-theme">{skills.name}</h2>

      <div className="space-y-3">
        {visibleItems.map((item) => (
          <PreviewBlock
            key={item.id}
            sectionId="skills"
            itemId={item.id}
            label={item.name || 'skill'}
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="font-semibold text-base">{item.name}</div>
              <div className="text-sm text-gray-600 flex-shrink-0">{item.level}</div>
            </div>

            {item.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.keywords.map((keyword, index) => (
                  <Badge key={`${item.id}-${index}`} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </PreviewBlock>
        ))}
      </div>
    </div>
  )
}

export default Skills
