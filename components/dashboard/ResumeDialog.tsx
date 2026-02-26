'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createResume, updateResume } from '@/services/resume';
import { sampleResume } from '@/types/resume/sample';
import { defaultResumeData, type ResumeItem, resumeSchema } from '@/types';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface ResumeDialogProps {
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  trigger: React.ReactNode;
  resume?: ResumeItem;
}

const resumeInfoSchema = resumeSchema.pick({ title: true, description: true });

// Todo: 增加visibility 设置
export function ResumeDialog({ mode, onSuccess, trigger, resume }: ResumeDialogProps) {
  const [open, setOpen] = useState(false);

  const [useTemplate, setUseTemplate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof resumeInfoSchema>>({
    resolver: zodResolver(resumeInfoSchema),
    defaultValues: {
      title: resume?.title || '',
      description: resume?.description || '',
    },
  });

  const isCreate = mode === 'create';

  // Reset form when dialog opens/closes or resume changes
  useEffect(() => {
    if (open) {
      reset({
        title: resume?.title || '',
        description: resume?.description || '',
      });
      setUseTemplate(false);
    }
  }, [open, resume]);

  const onSubmit = async (values: { title: string; description: string }) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isCreate) {
        await createResume({
          title: values.title,
          description: values.description,
          ...(useTemplate ? { data: sampleResume } : { data: defaultResumeData }),
        });
      } else if (resume) {
        await updateResume(resume.id, {
          title: values.title,
          description: values.description,
        });
      }
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save resume:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Create new resume' : 'Edit resume'}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Give your resume a title and optional description. You can edit the content later.'
              : 'Update the title and description for this resume.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Frontend Developer Resume"
                {...register('title', { required: 'Title is required' })}
                disabled={isSaving}
              />
              {errors.title && (
                <span className="text-xs text-destructive">{errors.title.message as string}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this resume..."
                {...register('description')}
                rows={3}
                disabled={isSaving}
              />
            </div>
            {isCreate && (
              <div className="flex items-center gap-2">
                <input
                  aria-label="use sample template"
                  type="checkbox"
                  id="useTemplate"
                  checked={useTemplate}
                  onChange={e => setUseTemplate(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={isSaving}
                />
                <Label htmlFor="useTemplate" className="text-sm font-normal cursor-pointer">
                  Use sample template as starting point
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (isCreate ? 'Creating...' : 'Saving...') : isCreate ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
