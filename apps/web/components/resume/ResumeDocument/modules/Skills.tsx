'use client'

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
      <h2 data-resume-heading className="font-semibold">
        {skills.name}
      </h2>

      <ul className="list-disc">
        {visibleItems.map((item) => (
          <li key={item.id}>
            <PreviewBlock sectionId="skills" itemId={item.id} label={item.name} className="min-w-0">
              <strong>{item.name}</strong>
              {item.keywords.length > 0 && `: ${item.keywords.join(', ')}`}
              {item.level && <span className="text-neutral-700"> · {item.level}</span>}
            </PreviewBlock>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Skills
