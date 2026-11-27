'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ResumeDialog } from '@/components/dashboard/ResumeDialog'
import { ResumeCard } from '@/components/dashboard/ResumeCard'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Plus } from 'lucide-react'
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
    <div className="mx-auto max-w-7xl space-y-8">
      <ResumeDialog
        mode="create"
        open={open}
        onOpenChange={setOpen}
        onSuccess={invalidateResumes}
      />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-5xl tracking-tight">Resumes</h1>
        <Button
          className="rounded-full bg-[#314b3b] text-white hover:bg-[#25392d]"
          onClick={() => setOpen(true)}
        >
          <Plus aria-hidden="true" />
          New resume
        </Button>
      </header>

      {isPending && (
        <div
          aria-busy="true"
          className="grid grid-cols-[repeat(auto-fill,min(100%,18.75rem))] gap-x-5 gap-y-6"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-[210/297] rounded-md" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
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

      {!isPending && !isError && resumes.length === 0 && (
        <div className="grid justify-items-center gap-4 rounded-3xl border border-dashed border-[#d7d9cf] py-20">
          <span className="grid size-14 place-items-center rounded-full bg-[#e8eae0] text-[#314b3b]">
            <FileText aria-hidden="true" className="size-6" />
          </span>
          <h2 className="text-lg font-medium">No resumes yet</h2>
        </div>
      )}

      {!isPending && resumes.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,min(100%,18.75rem))] gap-x-5 gap-y-6">
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
