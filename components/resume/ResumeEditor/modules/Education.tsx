'use client';

import { useState } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import { defaultEducation, type Education as EducationType } from '@/types/resume';
import { createId } from '@paralleldrive/cuid2';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import ModuleItemList from '../components/ModuleItemList';
import RichTextEditor from '../components/RichTextEditor';
import ModuleHeader from '../components/ModuleHeader';
import { Plus } from 'lucide-react';

export default function Education() {
  const { resume, updateResume } = useResumeStore();
  const [editingItem, setEditingItem] = useState<EducationType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!resume) return null;

  const { education } = resume.modules;

  const addNewItem = () => {
    const newItem: EducationType = {
      ...defaultEducation,
      id: createId(),
    };
    setEditingItem(newItem);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingItem) return;

    updateResume(draft => {
      const index = draft.modules.education.items.findIndex(item => item.id === editingItem.id);
      if (index >= 0) {
        draft.modules.education.items[index] = editingItem;
      } else {
        draft.modules.education.items.push(editingItem);
      }
    });

    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleEdit = (item: EducationType) => {
    setEditingItem({ ...item });
    setIsDialogOpen(true);
  };

  const handleRemove = (id: string) => {
    updateResume(draft => {
      draft.modules.education.items = draft.modules.education.items.filter(item => item.id !== id);
    });
  };

  const toggleVisibility = (id: string) => {
    updateResume(draft => {
      const item = draft.modules.education.items.find(item => item.id === id);
      if (item) {
        item.visible = !item.visible;
      }
    });
  };

  const handleReorder = (sourceId: string, targetId: string) => {
    updateResume(draft => {
      const items = draft.modules.education.items;
      const fromIndex = items.findIndex(item => item.id === sourceId);
      const toIndex = items.findIndex(item => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
    });
  };

  const updateField = (field: keyof EducationType, value: string) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, [field]: value });
    }
  };

  return (
    <div className="space-y-4">
      <ModuleHeader moduleId="education" />
      <ModuleItemList
        items={education.items}
        getTitle={item => item.university || 'Untitled'}
        getSubtitle={item => item.major}
        onToggleVisibility={toggleVisibility}
        onEdit={handleEdit}
        onRemove={handleRemove}
        onReorder={handleReorder}
      />

      <Button onClick={addNewItem} variant="outline" className="w-full" size="lg">
        <Plus className="mr-2 h-4 w-4" />
        Add a new item
      </Button>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Education</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              <Input
                id="university"
                value={editingItem?.university || ''}
                onChange={e => updateField('university', e.target.value)}
                placeholder="e.g., Stanford University"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="major">Degree / Major</Label>
              <Input
                id="major"
                value={editingItem?.major || ''}
                onChange={e => updateField('major', e.target.value)}
                placeholder="e.g., Bachelor of Science in Computer Science"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={editingItem?.location || ''}
                  onChange={e => updateField('location', e.target.value)}
                  placeholder="e.g., Stanford, CA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  value={editingItem?.date || ''}
                  onChange={e => updateField('date', e.target.value)}
                  placeholder="e.g., 2015-08 ~ 2019-05"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <RichTextEditor
                value={editingItem?.summary || ''}
                onChange={value => updateField('summary', value)}
                placeholder="Describe your achievements, awards, or relevant coursework..."
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
