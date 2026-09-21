'use client';

import { useState } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import {
  defaultCustom,
  type Custom as CustomType,
  type CustomModule,
  type CustomModuleId,
} from '@/types/resume';
import { createId } from '@paralleldrive/cuid2';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import ModuleHeader from '../components/ModuleHeader';
import ModuleItemList from '../components/ModuleItemList';
import RichTextEditor from '../components/RichTextEditor';
import { Plus } from 'lucide-react';

interface CustomProps {
  moduleId: CustomModuleId;
}

export default function Custom({ moduleId }: CustomProps) {
  const { resume, updateResume } = useResumeStore();
  const [editingItem, setEditingItem] = useState<CustomType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!resume) return null;

  const module = resume.modules[moduleId] as CustomModule | undefined;
  if (!module) return null;

  const addNewItem = () => {
    const newItem: CustomType = {
      ...defaultCustom,
      id: createId(),
    };
    setEditingItem(newItem);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingItem) return;

    updateResume(draft => {
      const targetModule = draft.modules[moduleId] as CustomModule | undefined;
      if (!targetModule) return;
      const index = targetModule.items.findIndex(item => item.id === editingItem.id);
      if (index >= 0) {
        targetModule.items[index] = editingItem;
      } else {
        targetModule.items.push(editingItem);
      }
    });

    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleEdit = (item: CustomType) => {
    setEditingItem({ ...item });
    setIsDialogOpen(true);
  };

  const handleRemove = (id: string) => {
    updateResume(draft => {
      const targetModule = draft.modules[moduleId] as CustomModule | undefined;
      if (!targetModule) return;
      targetModule.items = targetModule.items.filter(item => item.id !== id);
    });
  };

  const toggleVisibility = (id: string) => {
    updateResume(draft => {
      const targetModule = draft.modules[moduleId] as CustomModule | undefined;
      if (!targetModule) return;
      const item = targetModule.items.find(item => item.id === id);
      if (item) {
        item.visible = !item.visible;
      }
    });
  };

  const handleReorder = (sourceId: string, targetId: string) => {
    updateResume(draft => {
      const targetModule = draft.modules[moduleId] as CustomModule | undefined;
      if (!targetModule) return;
      const items = targetModule.items;
      const fromIndex = items.findIndex(item => item.id === sourceId);
      const toIndex = items.findIndex(item => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
    });
  };

  const updateField = (field: keyof CustomType, value: string) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, [field]: value });
    }
  };

  const updateWebsiteField = (field: 'label' | 'link', value: string) => {
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        website: {
          ...editingItem.website,
          [field]: value,
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      <ModuleHeader moduleId={moduleId} />

      <ModuleItemList
        items={module.items}
        getTitle={item => item.name || 'Untitled'}
        getSubtitle={item => item.description}
        onToggleVisibility={toggleVisibility}
        onEdit={handleEdit}
        onRemove={handleRemove}
        onReorder={handleReorder}
      />

      <Button onClick={addNewItem} variant="outline" className="w-full" size="lg">
        <Plus className="mr-2 h-4 w-4" />
        Add a new item
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editingItem?.name || ''}
                onChange={e => updateField('name', e.target.value)}
                placeholder="e.g., Volunteer Experience"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editingItem?.description || ''}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Short one-line description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  value={editingItem?.date || ''}
                  onChange={e => updateField('date', e.target.value)}
                  placeholder="e.g., 2023"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={editingItem?.location || ''}
                  onChange={e => updateField('location', e.target.value)}
                  placeholder="e.g., Stockholm, Sweden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website-label">Link Label</Label>
                <Input
                  id="website-label"
                  value={editingItem?.website.label || ''}
                  onChange={e => updateWebsiteField('label', e.target.value)}
                  placeholder="e.g., View Details"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website-link">Link URL</Label>
                <Input
                  id="website-link"
                  value={editingItem?.website.link || ''}
                  onChange={e => updateWebsiteField('link', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <RichTextEditor
                value={editingItem?.summary || ''}
                onChange={value => updateField('summary', value)}
                placeholder="Add details, impact, or highlights..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
