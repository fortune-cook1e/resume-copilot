'use client';

import { useResumeStore } from '@/stores/resume-store';
import { renderMarkdown } from '@/lib/markdown';
import { entryText, entryTitle, getSectionType, sectionCatalog, type SectionId } from '../../ResumeEditor/sections';
import PreviewBlock from '../PreviewBlock';
import Link from './Link';

export default function Content({ sectionId }: { sectionId: SectionId }) {
  const section = useResumeStore(state => state.resume?.modules[sectionId]);
  if (!section?.visible) return null;
  const type = getSectionType(sectionId, section);
  const text = 'content' in section ? section.content : undefined;
  const visible = section.items.filter(item => item.visible && entryText(item, type === 'custom' ? 'name' : sectionCatalog[type].primary).trim());
  if (!text?.trim() && !visible.length) return null;
  return <div className="space-y-1">
    <h2 className="text-xl font-semibold text-resume-theme">{section.name}</h2>
    {text && <PreviewBlock sectionId={sectionId} label={section.name} className="text-sm text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" ><div dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} /></PreviewBlock>}
    <div className="space-y-3">{visible.map(item => <PreviewBlock key={item.id} sectionId={sectionId} itemId={item.id} label={entryTitle(item, type)} className="space-y-1">
      {type !== 'summary' && <div className="flex justify-between gap-4"><div className="text-base font-semibold">{entryTitle(item, type)}</div><div className="shrink-0 text-sm">{entryText(item, 'date')}</div></div>}
      <div className="text-sm text-gray-700">{(type === 'custom' ? ['description', 'location'] : [...sectionCatalog[type].fields.slice(1).map(field => field.key), 'location']).map(key => entryText(item, key)).filter(Boolean).join(' · ')}</div>
      {'rating' in item && item.rating > 0 && <div className="text-xs text-gray-600" aria-label={'Level ' + item.rating + ' out of 5'}>{'●'.repeat(item.rating)}{'○'.repeat(5 - item.rating)}</div>}
      {'level' in item && typeof item.level === 'string' && <div className="text-sm text-gray-600">{item.level}</div>}
      {'keywords' in item && !!item.keywords.length && <div className="text-sm">{item.keywords.join(' · ')}</div>}
      {'website' in item && item.website.link && <div className="text-sm text-resume-theme"><Link url={item.website} label={item.website.label || 'Link'} /></div>}
      {'summary' in item && item.summary && <div className="text-sm text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.summary) }} />}
    </PreviewBlock>)}</div>
  </div>;
}
