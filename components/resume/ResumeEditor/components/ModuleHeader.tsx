'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Pencil, Check } from 'lucide-react';
import { useResumeStore } from '@/stores/resume-store';
import type { Modules } from '@/types/resume';

interface ModuleHeaderProps {
  moduleId: keyof Modules;
  canEditName?: boolean;
}

export default function ModuleHeader({ moduleId, canEditName = true }: ModuleHeaderProps) {
  const { resume, updateResume } = useResumeStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  if (!resume) return null;

  const module = resume.modules[moduleId];

  const startEditing = () => {
    if (!canEditName) return;
    setDraftName(module.name || '');
    setIsEditing(true);
  };

  const finishEditing = () => {
    const nextName = draftName.trim();
    updateResume(draft => {
      if (!nextName) return;
      draft.modules[moduleId].name = nextName;
    });
    setIsEditing(false);
  };

  const toggleVisibility = () => {
    updateResume(draft => {
      draft.modules[moduleId].visible = !draft.modules[moduleId].visible;
    });
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {isEditing ? (
          <Input
            value={draftName}
            onChange={event => setDraftName(event.target.value)}
            onBlur={finishEditing}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                finishEditing();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setIsEditing(false);
              }
            }}
            className="h-8 w-48"
            autoFocus
          />
        ) : (
          <h3 className="text-lg font-semibold text-gray-900">{module.name}</h3>
        )}

        {canEditName && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={isEditing ? finishEditing : startEditing}
            title={isEditing ? 'Save name' : 'Edit name'}
          >
            {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleVisibility}
        title={module.visible ? 'Hide module' : 'Show module'}
      >
        {module.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}
