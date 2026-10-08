'use client';

import { createId } from '@paralleldrive/cuid2';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/stores/resume-store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { CustomModuleId, Modules, SectionType } from '@/types/resume';
import { sectionTypes } from '@/types/resume/modules/content';
import type { EditorSelectionProps } from '@/types/resume/editor';
import Basics from './modules/Basics';
import SectionEditor from './components/SectionEditor';
import { SortableList } from './components/SortableList';
import { createEntry, getSectionOrder, sectionCatalog, type SectionId } from './sections';

export default function ResumeEditor({ selection, onSelect }: Required<EditorSelectionProps>) {
  const [basicsExpanded, setBasicsExpanded] = useState(false);
  const [added, setAdded] = useState<SectionId[]>([]);
  const basics = useResumeStore(state => state.resume?.basics);
  const ids = useResumeStore(useShallow(state => state.resume ? getSectionOrder(state.resume).filter(id => {
    const section = state.resume!.modules[id]!;
    return id.startsWith('custom-') || section.items.length > 0 || ('content' in section && !!section.content) || added.includes(id) || selection?.sectionId === id;
  }) : []));
  const isReady = useResumeStore(state => state.isReady);
  if (!isReady || !basics) return null;

  const unused = sectionTypes.filter(id => !ids.includes(id));
  const reorder = (from: string, to: string) => useResumeStore.getState().updateResume(draft => {
    const order = getSectionOrder(draft);
    const source = order.indexOf(from as SectionId), target = order.indexOf(to as SectionId);
    if (source < 0 || target < 0 || source === target) return;
    const [moved] = order.splice(source, 1);
    order.splice(target, 0, moved);
    draft.sectionOrder = order;
  });
  const addSection = (type: SectionType, custom = false) => {
    const id: SectionId = custom ? `custom-${createId()}` as CustomModuleId : type;
    const item = type === 'summary' && !custom ? undefined : createEntry(type);
    useResumeStore.getState().updateResume(draft => {
      if (custom || !draft.modules[id]) {
        const section = { id, name: sectionCatalog[type].title, visible: true, type, items: item ? [item] : [], ...(type === 'summary' && !custom ? { content: '' } : {}) };
        (draft.modules as Record<string, Modules[SectionId]>)[id] = section as Modules[SectionId];
      } else {
        const section = draft.modules[id]!;
        section.visible = true;
        if (item) section.items = [item] as typeof section.items;
      }
      draft.sectionOrder = getSectionOrder(draft);
    });
    setAdded(current => [...current, id]);
    onSelect({ sectionId: id, itemId: item?.id });
  };

  const basicsOpen = basicsExpanded || selection?.sectionId === 'basics';
  const initials = basics.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('') || 'A';
  return <div className="p-5 text-stone-800 dark:text-stone-100">
    <section className="mb-6 overflow-hidden rounded-xl border border-stone-200 bg-background dark:border-stone-800">
      <button type="button" className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring" aria-label="Basics" aria-expanded={basicsOpen} onClick={() => { setBasicsExpanded(!basicsOpen); onSelect(basicsOpen ? null : { sectionId: 'basics' }); }}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800 dark:bg-emerald-950">{initials}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{basics.name || 'Personal details'}</span><span className="block truncate text-xs text-muted-foreground">{[basics.headline, basics.location].filter(Boolean).join(' · ') || 'Name, headline, and contact details'}</span></span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${basicsOpen ? 'rotate-180' : ''}`} />
      </button>
      {basicsOpen && <div className="border-t p-3"><Basics /></div>}
    </section>
    <div className="mb-2 flex items-center justify-between px-1"><h2 className="text-[11px] font-medium uppercase tracking-widest text-stone-500">Sections · Print order</h2><span className="text-[11px] text-stone-400">drag · ⌥↑↓</span></div>
    <SortableList ids={ids} onReorder={reorder}>
      <div className="space-y-0.5">{ids.map((id, index) => <SectionEditor key={id} sectionId={id} selection={selection} onSelect={onSelect} onMove={direction => {
        const target = ids[index + direction];
        if (target) reorder(id, target);
      }} canMoveUp={index > 0} canMoveDown={index < ids.length - 1} />)}</div>
    </SortableList>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="mt-2 h-10 w-full gap-1.5 rounded-lg border-dashed border-stone-300 bg-transparent text-stone-600"><Plus className="size-4" />Add section</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(360px,calc(100vw-40px))] rounded-xl p-1.5">
        {!!unused.length && <div className="grid grid-cols-2 gap-0.5">{unused.map(type => <DropdownMenuItem key={type} onSelect={() => addSection(type)}>{sectionCatalog[type].title}</DropdownMenuItem>)}</div>}
        {!!unused.length && <DropdownMenuSeparator />}
        <DropdownMenuSub><DropdownMenuSubTrigger>Custom section</DropdownMenuSubTrigger><DropdownMenuSubContent className="max-h-[70vh] overflow-y-auto rounded-xl max-sm:-translate-x-full">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">What goes in it?</DropdownMenuLabel>
          {sectionTypes.map(type => <DropdownMenuItem key={type} onSelect={() => addSection(type, true)}>{sectionCatalog[type].title}</DropdownMenuItem>)}
        </DropdownMenuSubContent></DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
    <p className="mt-3 px-1 text-[11px] leading-relaxed text-stone-400">Hidden sections keep their content but aren&apos;t printed or shared. Fields save as you type.</p>
  </div>;
}
