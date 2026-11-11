'use client'

import { useResumeStore } from '@/stores/resume-store'
import { renderMarkdown } from '@/lib/markdown'
import {
  entryText,
  entryTitle,
  getSectionType,
  sectionCatalog,
  type SectionId,
} from '../../ResumeEditor/sections'
import PreviewBlock from '../PreviewBlock'
import SectionHeading from '../SectionHeading'
import EntryHeader from '../EntryHeader'
import Link, { projectWebsiteHref } from './Link'

export default function Content({ sectionId }: { sectionId: SectionId }) {
  const section = useResumeStore((state) => state.resume?.modules[sectionId])
  if (!section?.visible) return null
  const type = getSectionType(sectionId, section)
  const text = 'content' in section ? section.content : undefined
  const visible = section.items.filter(
    (item) =>
      item.visible &&
      entryText(item, type === 'custom' ? 'name' : sectionCatalog[type].primary).trim(),
  )
  if (!text?.trim() && !visible.length) return null
  return (
    <div className="space-y-1">
      <SectionHeading>{section.name}</SectionHeading>
      {text && (
        <PreviewBlock
          sectionId={sectionId}
          label={section.name}
          className="text-neutral-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        >
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
        </PreviewBlock>
      )}
      <div className="resume-entries">
        {visible.map((item) => {
          const website = 'website' in item ? item.website : undefined
          const href =
            type === 'projects' && website ? projectWebsiteHref(website.link) : website?.link
          const titleHref =
            type === 'projects' && website && 'inlineLink' in website && website.inlineLink
              ? href
              : undefined
          return (
            <PreviewBlock
              key={item.id}
              sectionId={sectionId}
              itemId={item.id}
              label={entryTitle(item, type)}
              className="space-y-1"
            >
              {type !== 'summary' && (
                <EntryHeader
                  title={entryTitle(item, type)}
                  titleHref={titleHref}
                  date={entryText(item, 'date')}
                  location={entryText(item, 'location')}
                />
              )}
              <div className="text-neutral-700">
                {(type === 'custom'
                  ? ['description']
                  : sectionCatalog[type].fields.slice(1).map((field) => field.key)
                )
                  .map((key) => entryText(item, key))
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              {'rating' in item && typeof item.rating === 'number' && item.rating > 0 && (
                <div
                  className="text-xs text-gray-600"
                  aria-label={'Level ' + item.rating + ' out of 5'}
                >
                  {'●'.repeat(item.rating)}
                  {'○'.repeat(5 - item.rating)}
                </div>
              )}
              {'level' in item && typeof item.level === 'string' && (
                <div className="text-neutral-700">{item.level}</div>
              )}
              {'keywords' in item && !!item.keywords.length && (
                <div className="text-sm">{item.keywords.join(' · ')}</div>
              )}
              {website && href && !titleHref && (
                <div className="text-neutral-800">
                  <Link
                    url={{ ...website, link: href }}
                    label={website.label || 'Link'}
                    projectLink={type === 'projects'}
                  />
                </div>
              )}
              {'summary' in item && item.summary && (
                <div
                  className="text-neutral-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(item.summary) }}
                />
              )}
            </PreviewBlock>
          )
        })}
      </div>
    </div>
  )
}
