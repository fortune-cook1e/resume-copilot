'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResumeStore } from '@/stores/resume-store';
import { defaultSkills, type Skills as SkillsType } from '@/types/resume';
import { createId } from '@paralleldrive/cuid2';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import ModuleHeader from '../components/ModuleHeader';
import ModuleItemList from '../components/ModuleItemList';
import { Plus } from 'lucide-react';

const levelOptions: SkillsType['level'][] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const skillSchema = z.object({
  name: z.string().min(1, 'Category is required'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  keywords: z.string(), // raw comma-separated string; parsed on save
});
type SkillFormValues = z.infer<typeof skillSchema>;

export default function Skills() {
  const { resume, updateResume } = useResumeStore();

  // Tracks the id/visible metadata of the item being edited (not covered by the form)
  const [editingMeta, setEditingMeta] = useState<Pick<SkillsType, 'id' | 'visible'> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { handleSubmit, reset, control } = useForm<SkillFormValues>({
    resolver: zodResolver(skillSchema),
    defaultValues: { name: '', level: 'Beginner', keywords: '' },
  });

  if (!resume) return null;

  const { skills } = resume.modules;

  const openDialog = (item?: SkillsType) => {
    if (item) {
      setEditingMeta({ id: item.id, visible: item.visible });
      reset({
        name: item.name,
        level: item.level,
        keywords: item.keywords?.join(', ') ?? '',
      });
    } else {
      setEditingMeta({ id: createId(), visible: true });
      reset({ name: '', level: 'Beginner', keywords: '' });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMeta(null);
  };

  const onSubmit = (values: SkillFormValues) => {
    if (!editingMeta) return;

    const saved: SkillsType = {
      ...defaultSkills,
      id: editingMeta.id,
      visible: editingMeta.visible,
      name: values.name,
      level: values.level,
      keywords: values.keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean),
    };

    updateResume(draft => {
      const index = draft.modules.skills.items.findIndex(i => i.id === saved.id);
      if (index >= 0) {
        draft.modules.skills.items[index] = saved;
      } else {
        draft.modules.skills.items.push(saved);
      }
    });

    closeDialog();
  };

  const handleRemove = (id: string) => {
    updateResume(draft => {
      draft.modules.skills.items = draft.modules.skills.items.filter(i => i.id !== id);
    });
  };

  const toggleVisibility = (id: string) => {
    updateResume(draft => {
      const item = draft.modules.skills.items.find(i => i.id === id);
      if (item) item.visible = !item.visible;
    });
  };

  const handleReorder = (sourceId: string, targetId: string) => {
    updateResume(draft => {
      const items = draft.modules.skills.items;
      const fromIndex = items.findIndex(i => i.id === sourceId);
      const toIndex = items.findIndex(i => i.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
    });
  };

  return (
    <div className="space-y-4">
      <ModuleHeader moduleId="skills" />

      <ModuleItemList
        items={skills.items}
        getTitle={item => item.name || 'Untitled'}
        getSubtitle={item => item.level}
        onToggleVisibility={toggleVisibility}
        onEdit={openDialog}
        onRemove={handleRemove}
        onReorder={handleReorder}
      />

      <Button onClick={() => openDialog()} variant="outline" className="w-full" size="lg">
        <Plus className="mr-2 h-4 w-4" />
        Add a new item
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FieldGroup>
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Skill Category</FieldLabel>
                    <Input {...field} placeholder="e.g., Frontend" />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="level"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Level</FieldLabel>
                    <select
                      {...field}
                      title="Skill level"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {levelOptions.map(level => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="keywords"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Keywords</FieldLabel>
                    <Input {...field} placeholder="React, TypeScript, Tailwind CSS" />
                    <FieldDescription>
                      Separate each keyword with a comma, e.g. React, TypeScript, Node.js
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
