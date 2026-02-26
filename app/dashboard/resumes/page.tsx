'use client';

import { useEffect, useState, useCallback } from 'react';
import { ResumeDialog } from '@/components/dashboard/ResumeDialog';
import { ResumeCard } from '@/components/dashboard/ResumeCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { getResumes } from '@/services/resume';
import { Button } from '@/components/ui/button';
import type { ResumeItem } from '@/types';

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResumes = async () => {
    try {
      const data = await getResumes();
      setResumes(data ?? []);
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground">Create and manage your resumes</p>
        </div>
        <ResumeDialog
          mode="create"
          onSuccess={fetchResumes}
          trigger={<Button>Create Resume</Button>}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && resumes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No resumes yet</h3>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
            Create your first resume to get started. You can customize it with your experience,
            education, and skills.
          </p>
          <div className="mt-6">
            <ResumeDialog
              mode="create"
              onSuccess={fetchResumes}
              trigger={<Button>Create Resume</Button>}
            />
          </div>
        </div>
      )}

      {/* Resume grid */}
      {!isLoading && resumes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map(resume => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              onDeleted={fetchResumes}
              onEdit={fetchResumes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
