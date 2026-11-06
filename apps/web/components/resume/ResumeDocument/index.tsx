'use client'

import type { CSSProperties } from 'react'
import { useResumeStore } from '@/stores/resume-store'
import Basics from './modules/Basics'
import Education from './modules/Education'
import Experience from './modules/Experience'
import Projects from './modules/Projects'
import Skills from './modules/Skills'
import Custom from './modules/Custom'
import Content from './modules/Content'
import { getSectionOrder } from '../ResumeEditor/sections'
import type { CustomModuleId } from '@resume-copilot/contracts'
import type { EditorSelectionProps } from '@/types/resume/editor'
import { PreviewSelectionContext } from './PreviewBlock'
import { resolveResumeTypography } from './typography'
import { resumeFontCss } from './font-sources'

const fontStacks = {
  'EB Garamond': '"EB Garamond", Georgia, serif',
  Tinos: 'Tinos, Georgia, serif',
  'Source Serif 4': '"Source Serif 4", Georgia, serif',
  'Source Sans 3': '"Source Sans 3", Arial, sans-serif',
  Carlito: 'Carlito, Arial, sans-serif',
  Lato: 'Lato, Arial, sans-serif',
  Helvetica: 'Helvetica, Arial, sans-serif',
  Times: '"Times New Roman", Times, serif',
  Courier: '"Courier New", Courier, monospace',
}

export default function ResumeDocument({
  selection,
  onSelect,
  sourceId = 'resume-document',
}: EditorSelectionProps & { sourceId?: string } = {}) {
  const { resume } = useResumeStore()
  if (!resume) {
    return <div id={sourceId} data-ready="false" className="p-custom" />
  }

  const builtins = {
    education: Education,
    experience: Experience,
    projects: Projects,
    skills: Skills,
  }
  const variables: Record<string, string | number> = {}
  const typography = resolveResumeTypography(resume.typography)
  for (const group of ['heading', 'body'] as const) {
    const style = typography[group]
    variables[`--resume-${group}-family`] = fontStacks[style.fontFamily]
    variables[`--resume-${group}-pdf-font`] = style.fontFamily
    variables[`--resume-${group}-size`] = `${style.fontSize}pt`
    variables[`--resume-${group}-line-height`] = style.lineHeight
    if (group === 'heading') variables['--resume-name-size'] = `${style.fontSize * 1.5}pt`
  }

  return (
    <PreviewSelectionContext.Provider value={onSelect ? { selection, onSelect } : null}>
      <style href="resume-preset-fonts" precedence="default">
        {resumeFontCss}
      </style>
      <div
        id={sourceId}
        data-ready="false"
        className="resume-typography space-y-4"
        style={variables as CSSProperties}
      >
        <Basics />
        {getSectionOrder(resume).map((sectionId) => {
          const section = resume.modules[sectionId]!
          let content
          if (sectionId in builtins) {
            const Component = builtins[sectionId as keyof typeof builtins]
            content = <Component />
          } else if (sectionId.startsWith('custom-') && !('type' in section && section.type)) {
            content = <Custom moduleId={sectionId as CustomModuleId} />
          } else {
            content = <Content sectionId={sectionId} />
          }
          return (
            <div
              key={sectionId}
              data-pagination-section={sectionId}
              data-start-on-new-page={section.startOnNewPage || undefined}
              data-keep-together={section.keepTogether || undefined}
            >
              {content}
            </div>
          )
        })}
      </div>
    </PreviewSelectionContext.Provider>
  )
}
