'use client';

import { useState } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import { defaultExperience, type Experience as ExperienceType } from '@/types/resume';
import { createId } from '@paralleldrive/cuid2';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import ModuleItemList from '../components/ModuleItemList';
import RichTextEditor from '../components/RichTextEditor';
import { Plus } from 'lucide-react';

export default function Experience() {
  const { resume, updateResume } = useResumeStore();
  const [editingItem, setEditingItem] = useState<ExperienceType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!resume) return null;

  const { experience } = resume.modules;

  const addNewItem = () => {
    const newItem: ExperienceType = {
      ...defaultExperience,
      id: createId(),
    };
    setEditingItem(newItem);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingItem) return;

    updateResume(draft => {
      const index = draft.modules.experience.items.findIndex(item => item.id === editingItem.id);
      if (index >= 0) {
        draft.modules.experience.items[index] = editingItem;
      } else {
        draft.modules.experience.items.push(editingItem);
      }
    });

    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleEdit = (item: ExperienceType) => {
    setEditingItem({ ...item });
    setIsDialogOpen(true);
  };

  const handleRemove = (id: string) => {
    updateResume(draft => {
      draft.modules.experience.items = draft.modules.experience.items.filter(
        item => item.id !== id,
      );
    });
  };

  const toggleVisibility = (id: string) => {
    updateResume(draft => {
      const item = draft.modules.experience.items.find(item => item.id === id);
      if (item) {
        item.visible = !item.visible;
      }
    });
  };

  const handleReorder = (sourceId: string, targetId: string) => {
    updateResume(draft => {
      const items = draft.modules.experience.items;
      const fromIndex = items.findIndex(item => item.id === sourceId);
      const toIndex = items.findIndex(item => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
    });
  };

  const updateField = (field: keyof ExperienceType, value: string) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, [field]: value });
    }
  };

  return (
    <div className="space-y-4">
      <ModuleItemList
        items={experience.items}
        getTitle={item => item.company || 'Untitled'}
        getSubtitle={item => item.position}
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
            <DialogTitle>Edit Experience</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={editingItem?.company || ''}
                onChange={e => updateField('company', e.target.value)}
                placeholder="e.g., Google"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={editingItem?.position || ''}
                onChange={e => updateField('position', e.target.value)}
                placeholder="e.g., Software Engineer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={editingItem?.location || ''}
                  onChange={e => updateField('location', e.target.value)}
                  placeholder="e.g., Mountain View, CA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  value={editingItem?.date || ''}
                  onChange={e => updateField('date', e.target.value)}
                  placeholder="e.g., Jul 2018 - Aug 2025"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <RichTextEditor
                value={editingItem?.summary || ''}
                onChange={value => updateField('summary', value)}
                placeholder="Use bullet points or separate lines for achievements..."
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
