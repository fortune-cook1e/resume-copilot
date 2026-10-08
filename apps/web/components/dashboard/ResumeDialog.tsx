'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldDescription, FieldGroup, FieldError } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createResume, updateResume } from '@/services/resume';
import { sampleResume } from '@/types/resume/sample';
import { defaultResumeData, type ResumeItem, resumeSchema } from '@/types';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface ResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  resume?: ResumeItem;
}

const resumeDialogSchema = resumeSchema
  .pick({ title: true, description: true, visibility: true })
  .required();
type ResumeDialogValues = z.infer<typeof resumeDialogSchema>;

export function ResumeDialog({ open, onOpenChange, mode, onSuccess, resume }: ResumeDialogProps) {
  const [useTemplate, setUseTemplate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saving = useRef(false);
  const { handleSubmit, reset, control } = useForm<ResumeDialogValues>({
    resolver: zodResolver(resumeDialogSchema),
    defaultValues: {
      title: resume?.title || '',
      description: resume?.description || '',
      visibility: resume?.visibility || 'private',
    },
  });

  const isCreate = mode === 'create';

  // Reset form when dialog opens/closes or resume changes
  useEffect(() => {
    if (open) {
      reset({
        title: resume?.title || '',
        description: resume?.description || '',
        visibility: resume?.visibility || 'private',
      });
      setUseTemplate(false);
      setSaveError(false);
    }
  }, [open, resume, reset]);

  const onSubmit = async (values: ResumeDialogValues) => {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    setSaveError(false);

    try {
      const initialResumeData = useTemplate ? sampleResume : defaultResumeData;

      if (isCreate) {
        await createResume({
          ...values,
          data: initialResumeData,
        });
      } else if (resume) {
        await updateResume(resume.id, {
          ...values,
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setSaveError(true);
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!saving.current) onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Create new resume' : 'Edit resume'}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Give your resume a title and optional description. You can edit the content later.'
              : 'Update the title and description for this resume.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Controller
              name="title"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <Input
                    {...field}
                    disabled={isSaving}
                    id="title"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. Frontend Developer Resume"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <FieldGroup>
            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Field aria-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="description">Description (optional)</FieldLabel>
                  <Textarea
                    {...field}
                    disabled={isSaving}
                    id="description"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. A resume highlighting my experience as a frontend developer, including projects and skills."
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <FieldGroup>
            <Controller
              name="visibility"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="visibility">Visibility</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="visibility" className="w-full">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    This preference is saved with the resume. Public sharing is not available yet.
                  </FieldDescription>
                </Field>
              )}
            />
          </FieldGroup>

          {isCreate && (
            <FieldGroup>
              <Field orientation="horizontal">
                <Checkbox
                  id="useTemplate"
                  name="useTemplate"
                  aria-invalid={false}
                  checked={useTemplate}
                  disabled={isSaving}
                  onCheckedChange={(state: boolean) => setUseTemplate(state)}
                />
                <FieldLabel htmlFor="useTemplate">Use sample template as starting point</FieldLabel>
              </Field>
            </FieldGroup>
          )}

          {saveError ? (
            <p role="alert" className="text-sm text-destructive">
              {isCreate ? 'Could not create this resume.' : 'Could not save this resume.'} Your changes are still here. Please try again.
            </p>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
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
