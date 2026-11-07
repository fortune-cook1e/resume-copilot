'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ResumeDialog } from '@/components/dashboard/ResumeDialog'
import { ResumeCard } from '@/components/dashboard/ResumeCard'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText } from 'lucide-react'
import { getResumes } from '@/services/resume'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/auth-client'

export default function ResumesPage() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const userId = session?.user.id
  const queryClient = useQueryClient()
  const queryKey = ['resumes', userId] as const
  // Account-scoped server state; Authentication cancels/clears it on identity change.
  const {
    data: resumes = [],
    isPending,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: ({ signal }) => getResumes(signal),
    enabled: !!userId,
    retry: false,
  })
  const refreshResumes = () => {
    void refetch()
  }
  const invalidateResumes = () => {
    void queryClient.invalidateQueries({ queryKey, exact: true })
  }

  return (
    <div className="space-y-6">
      <ResumeDialog
        mode="create"
        open={open}
        onOpenChange={setOpen}
        onSuccess={invalidateResumes}
      />

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground">Create and manage your resumes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!userId || isFetching} onClick={refreshResumes}>
            {isFetching && !isPending ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button onClick={() => setOpen(true)}>
            <FileText className="h-4 w-4" />
            New Resume
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isPending && (
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

      {isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
        >
          <p className="text-sm text-destructive">Could not load your resumes. Please try again.</p>
          <Button variant="outline" disabled={isFetching} onClick={refreshResumes}>
            Try again
          </Button>
        </div>
      ) : null}

      {/* Empty state only after a successful response. */}
      {!isPending && !isError && resumes.length === 0 && (
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
            <Button onClick={() => setOpen(true)}>Create Resume</Button>
          </div>
        </div>
      )}

      {/* Resume grid */}
      {!isPending && resumes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              onDeleted={invalidateResumes}
              onEdit={invalidateResumes}
            />
          ))}
        </div>
      )}
    </div>
  )
}
