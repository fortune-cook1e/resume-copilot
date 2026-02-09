'use client';

import { useState } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import { defaultSkills, type Skills as SkillsType } from '@/types/resume';
import { createId } from '@paralleldrive/cuid2';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import ModuleHeader from '../components/ModuleHeader';
import ModuleItemList from '../components/ModuleItemList';
import { Plus } from 'lucide-react';

const levelOptions: SkillsType['level'][] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function Skills() {
  const { resume, updateResume } = useResumeStore();
  const [editingItem, setEditingItem] = useState<SkillsType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!resume) return null;

  const { skills } = resume.modules;

  const addNewItem = () => {
    const newItem: SkillsType = {
      ...defaultSkills,
      id: createId(),
    };
    setEditingItem(newItem);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingItem) return;

    updateResume(draft => {
      const index = draft.modules.skills.items.findIndex(item => item.id === editingItem.id);
      if (index >= 0) {
        draft.modules.skills.items[index] = editingItem;
      } else {
        draft.modules.skills.items.push(editingItem);
      }
    });

    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleEdit = (item: SkillsType) => {
    setEditingItem({ ...item });
    setIsDialogOpen(true);
  };

  const handleRemove = (id: string) => {
    updateResume(draft => {
      draft.modules.skills.items = draft.modules.skills.items.filter(item => item.id !== id);
    });
  };

  const toggleVisibility = (id: string) => {
    updateResume(draft => {
      const item = draft.modules.skills.items.find(item => item.id === id);
      if (item) {
        item.visible = !item.visible;
      }
    });
  };

  const handleReorder = (sourceId: string, targetId: string) => {
    updateResume(draft => {
      const items = draft.modules.skills.items;
      const fromIndex = items.findIndex(item => item.id === sourceId);
      const toIndex = items.findIndex(item => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
    });
  };

  const updateField = (field: 'name', value: string) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, [field]: value });
    }
  };

  const updateLevel = (value: SkillsType['level']) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, level: value });
    }
  };

  const updateKeywords = (value: string) => {
    if (editingItem) {
      const keywords = value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      setEditingItem({ ...editingItem, keywords });
    }
  };

  return (
    <div className="space-y-4">
      <ModuleHeader moduleId="skills" />

      <ModuleItemList
        items={skills.items}
        getTitle={item => item.name || 'Untitled'}
        getSubtitle={item => item.level}
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
            <DialogTitle>Edit Skill</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Skill Category</Label>
              <Input
                id="skill-name"
                value={editingItem?.name || ''}
                onChange={e => updateField('name', e.target.value)}
                placeholder="e.g., Frontend"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-level">Level</Label>
              <select
                id="skill-level"
                value={editingItem?.level || 'Beginner'}
                onChange={e => updateLevel(e.target.value as SkillsType['level'])}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {levelOptions.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-keywords">Keywords</Label>
              <Input
                id="skill-keywords"
                value={editingItem?.keywords?.join(', ') || ''}
                onChange={e => updateKeywords(e.target.value)}
                placeholder="React, TypeScript, Tailwind CSS"
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
