import type { CSSProperties } from 'react'
import type { ResumeItem } from '@resume-copilot/contracts'
import { FileText } from 'lucide-react'
import { resolveThemeColor } from '@/components/resume/ResumeDocument/design'
import styles from './resume-cover.module.css'

export function ResumeCover({ resume }: { resume: ResumeItem }) {
  const { preview, template = 'onyx' } = resume
  const hasContent =
    preview && (preview.name || preview.headline || preview.location || preview.sections.length)

  return (
    <div className={styles.cover} aria-hidden="true">
      {hasContent ? (
        <div
          data-template={template}
          className={styles.paper}
          style={{ '--cover-accent': resolveThemeColor(preview.themeColor) } as CSSProperties}
        >
          <div className={styles.identity}>
            {preview.name && <p className={styles.name}>{preview.name}</p>}
            {preview.headline && <p>{preview.headline}</p>}
            {preview.location && <p>{preview.location}</p>}
          </div>
          {preview.sections.map((section, index) => (
            <div className={styles.section} key={index}>
              <p className={styles.sectionTitle}>{section.name}</p>
              {section.entries.map(({ title, detail }, entryIndex) => (
                <div key={entryIndex}>
                  {title && <p className={styles.entryTitle}>{title}</p>}
                  {detail && <p>{detail}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <FileText className="size-7 text-neutral-400" />
      )}
    </div>
  )
}
