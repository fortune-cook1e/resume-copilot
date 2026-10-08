'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useResumeStore } from '@/stores/resume-store';
import RichTextEditor from './RichTextEditor';
import { entryText, getSectionType, sectionCatalog, type SectionId } from '../sections';

export default function EntryForm({ sectionId, itemId }: { sectionId: SectionId; itemId: string }) {
  const item = useResumeStore(state => state.resume?.modules[sectionId]?.items.find(item => item.id === itemId));
  const type = useResumeStore(state => {
    const section = state.resume?.modules[sectionId];
    return section ? getSectionType(sectionId, section) : 'custom';
  });
  const [keyword, setKeyword] = useState('');
  if (!item) return null;
  const update = useResumeStore.getState().updateResume;
  const updateText = (field: string, value: string) => update(draft => {
    const target = draft.modules[sectionId]?.items.find(item => item.id === itemId);
    if (target && field in target) (target as unknown as Record<string, unknown>)[field] = value;
  });
  const textField = ({ key, label }: { key: string; label: string }, autofocus = false) => <div key={key} className="space-y-1.5">
    <Label htmlFor={itemId + '-' + key} className="text-xs">{label}</Label>
    <Input id={itemId + '-' + key} autoFocus={autofocus} className="h-9 bg-background text-sm" value={entryText(item, key)} onChange={event => updateText(key, event.target.value)} />
  </div>;
  const addKeyword = () => {
    const values = keyword.split(',').map(value => value.trim()).filter(Boolean);
    if (!values.length) return;
    update(draft => {
      const target = draft.modules[sectionId]?.items.find(item => item.id === itemId);
      if (target && 'keywords' in target) target.keywords = Array.from(new Set([...target.keywords, ...values]));
    });
    setKeyword('');
  };
  const fields = type === 'custom' ? [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }] : sectionCatalog[type].fields;
  return <div className="space-y-3 border-t p-3">
    {fields.map((field, index) => textField(field, index === 0))}
    {('location' in item || 'date' in item) && <div className="grid grid-cols-2 gap-3">
      {'location' in item && textField({ key: 'location', label: 'Location' })}
      {'date' in item && textField({ key: 'date', label: ['awards', 'certifications', 'publications'].includes(type) ? 'Date' : 'Period' })}
    </div>}
    {'website' in item && <div className="space-y-3">
      {(['link', 'label'] as const).map(field => <div key={field} className="space-y-1.5">
        <Label htmlFor={itemId + '-website-' + field} className="text-xs">{field === 'link' ? 'Website' : 'Website label'}</Label>
        <Input id={itemId + '-website-' + field} className="h-9 bg-background" value={item.website[field]} placeholder={field === 'link' ? 'https://example.com' : 'Link text'} onChange={event => update(draft => {
          const target = draft.modules[sectionId]?.items.find(item => item.id === itemId);
          if (target && 'website' in target) target.website[field] = event.target.value;
        })} />
      </div>)}
    </div>}
    {'level' in item && typeof item.level === 'string' && <div className="space-y-1.5">
      <Label htmlFor={itemId + '-level'} className="text-xs">Proficiency</Label>
      <Select value={item.level} onValueChange={value => update(draft => {
        const target = draft.modules[sectionId]?.items.find(item => item.id === itemId);
        if (target && 'level' in target && ['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(value)) target.level = value as typeof target.level;
      })}><SelectTrigger id={itemId + '-level'} className="w-full bg-background"><SelectValue /></SelectTrigger><SelectContent>{['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select>
    </div>}
    {'rating' in item && <div className="space-y-1.5"><Label htmlFor={itemId + '-rating'} className="text-xs">Level</Label>
      <Select value={String(item.rating)} onValueChange={value => update(draft => { const target = draft.modules[sectionId]?.items.find(item => item.id === itemId); if (target && 'rating' in target) target.rating = Number(value); })}>
        <SelectTrigger id={itemId + '-rating'} className="w-full bg-background"><SelectValue /></SelectTrigger><SelectContent>{[0, 1, 2, 3, 4, 5].map(level => <SelectItem key={level} value={String(level)}>{level === 0 ? 'None' : level + ' / 5'}</SelectItem>)}</SelectContent>
      </Select>
    </div>}
    {'keywords' in item && <div className="space-y-2">
      <Label htmlFor={itemId + '-keywords'} className="text-xs">Keywords</Label>
      <div className="flex flex-wrap gap-1.5">{item.keywords.map((value, index) => <span key={index + '-' + value} className="inline-flex items-center gap-1 rounded-md border bg-background py-1 pl-2 text-xs">{value}<Button variant="ghost" size="icon" className="size-5" aria-label={'Remove ' + value} onClick={() => update(draft => {
        const target = draft.modules[sectionId]?.items.find(item => item.id === itemId);
        if (target && 'keywords' in target) target.keywords.splice(index, 1);
      })}><X className="size-3" /></Button></span>)}</div>
      <Input id={itemId + '-keywords'} className="h-9 bg-background" value={keyword} placeholder="Add keyword…" onChange={event => setKeyword(event.target.value)} onBlur={addKeyword} onKeyDown={event => {
        if ((event.key === 'Enter' || event.key === ',') && !event.nativeEvent.isComposing) { event.preventDefault(); addKeyword(); }
      }} />
    </div>}
    {'summary' in item && <div className="space-y-2"><p className="text-xs font-medium">{type === 'summary' ? 'Text' : 'Description'}</p><RichTextEditor value={item.summary} onChange={value => updateText('summary', value)} /></div>}
  </div>;
}
