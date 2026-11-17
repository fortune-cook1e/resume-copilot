'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { deleteResume } from '@/services/resume'
import { ResumeCover } from './ResumeCover'
import { ResumeDialog } from './ResumeDialog'
import type { ResumeItem } from '@resume-copilot/contracts'
import { useToggle } from '@/hooks'

interface ResumeCardProps {
  resume: ResumeItem
  onDeleted?: () => void
  onEdit?: () => void
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ResumeCard({ resume, onDeleted, onEdit }: ResumeCardProps) {
  const { value: open, toggle: toggleDialog } = useToggle()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const actionsButton = useRef<HTMLButtonElement>(null)

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    setDeleteError(false)
    try {
      await deleteResume(resume.id)
      setDeleteOpen(false)
      onDeleted?.()
    } catch {
      setDeleteError(true)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <ResumeDialog
        open={open}
        onOpenChange={toggleDialog}
        resume={resume}
        mode="edit"
        onSuccess={onEdit}
      />
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          if (!deleting) setDeleteOpen(nextOpen)
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            actionsButton.current?.focus()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes “{resume.title}”. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p role="alert" className="text-sm text-destructive">
              Could not delete this resume. Please try again.
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {deleting ? 'Deleting…' : 'Delete resume'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card className="relative block gap-0 rounded-2xl border-0 bg-transparent py-0 shadow-none ring-0">
        <Link
          href={`/builder/${encodeURIComponent(resume.id)}`}
          prefetch={false}
          className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <ResumeCover resume={resume} />
          <div className="mt-2 min-w-0 pr-9">
            <h2 className="line-clamp-2 text-sm leading-snug font-semibold wrap-anywhere">
              {resume.title}
            </h2>
            <time dateTime={resume.updatedAt} className="text-xs text-[#535b51]">
              {formatDate(resume.updatedAt)}
            </time>
          </div>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-0 bottom-0.5 rounded-md"
              ref={actionsButton}
              aria-label="Resume actions"
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={toggleDialog}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setDeleteError(false)
                setDeleteOpen(true)
              }}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>
    </>
  )
}
