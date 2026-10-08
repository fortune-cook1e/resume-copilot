'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useResumeStore } from '@/stores/resume-store';
import type { Modules } from '@/types/resume';

export default function ModuleHeader({ moduleId, onAdd, onMove, canMoveUp, canMoveDown }: { moduleId: keyof Modules; onAdd?: () => void; onMove?: (direction: -1 | 1) => void; canMoveUp?: boolean; canMoveDown?: boolean }) {
  const section = useResumeStore(state => state.resume?.modules[moduleId]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState('');
  if (!section) return null;
  const custom = moduleId.startsWith('custom-');
  const update = useResumeStore.getState().updateResume;
  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7 text-stone-400" aria-label={section.name + ' section actions'}><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        {onAdd && <DropdownMenuItem onSelect={onAdd}><Plus />Add entry</DropdownMenuItem>}
        <DropdownMenuItem disabled={!canMoveUp} onSelect={() => onMove?.(-1)}><ArrowUp />Move up</DropdownMenuItem>
        <DropdownMenuItem disabled={!canMoveDown} onSelect={() => onMove?.(1)}><ArrowDown />Move down</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { setName(section.name); setRenameOpen(true); }}><Pencil />Rename…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}><Trash2 />{custom ? 'Delete section' : 'Clear section'}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={renameOpen} onOpenChange={setRenameOpen}><DialogContent><DialogHeader><DialogTitle>Rename section</DialogTitle><DialogDescription>Change the heading shown on the page.</DialogDescription></DialogHeader>
      <form onSubmit={event => { event.preventDefault(); if (!name.trim()) return; update(draft => { draft.modules[moduleId]!.name = name.trim(); }); setRenameOpen(false); }} className="space-y-4">
        <Label htmlFor={moduleId + '-name'}>Section name</Label><Input id={moduleId + '-name'} value={name} onChange={event => setName(event.target.value)} />
        <DialogFooter><Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button><Button type="submit" disabled={!name.trim()}>Save</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader>
      <AlertDialogTitle>{custom ? 'Delete section?' : 'Clear section?'}</AlertDialogTitle>
      <AlertDialogDescription>This removes {custom ? '“' + section.name + '” and ' : ''}all its content from this resume. This cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={() => update(draft => {
      if (custom) { delete draft.modules[moduleId]; if (draft.sectionOrder) draft.sectionOrder = draft.sectionOrder.filter(id => id !== moduleId); }
      else { const target = draft.modules[moduleId]!; target.items = []; if ('content' in target) target.content = ''; }
    })}>{custom ? 'Delete section' : 'Clear section'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
