'use client';

import { useState } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import { defaultEducation, type Education as EducationType } from '@/types/resume';
import { createId } from '@paralleldrive/cuid2';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Plus, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';

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

  const updateField = (field: keyof EducationType, value: string) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, [field]: value });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {education.items.map(item => (
          <div
            key={item.id}
            className="group relative border rounded-lg p-4 hover:shadow-sm transition-shadow bg-white"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 cursor-grab text-gray-400 hover:text-gray-600">
                <GripVertical className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {item.university || 'Untitled'}
                </div>
                <div className="text-sm text-gray-500 truncate">{item.major}</div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="sr-only">Open menu</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleVisibility(item.id)}>
                    {item.visible ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>Show</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEdit(item)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleRemove(item.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Remove</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

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
              <Textarea
                id="summary"
                value={editingItem?.summary || ''}
                onChange={e => updateField('summary', e.target.value)}
                placeholder="Describe your achievements, awards, or relevant coursework..."
                rows={4}
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
