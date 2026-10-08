'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, MoreVertical, Pencil, Trash2, Eye, Clock } from 'lucide-react';
import { deleteResume } from '@/services/resume';
import { ResumeDialog } from './ResumeDialog';
import type { ResumeItem } from '@resume-copilot/contracts';
import { useToggle } from '@/hooks';

interface ResumeCardProps {
  resume: ResumeItem;
  onDeleted?: () => void;
  onEdit?: () => void;
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ResumeCard({ resume, onDeleted, onEdit }: ResumeCardProps) {
  const router = useRouter();
  const { value: open, toggle: toggleDialog } = useToggle();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const actionsButton = useRef<HTMLButtonElement>(null);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await deleteResume(resume.id);
      setDeleteOpen(false);
      onDeleted?.();
    } catch {
      setDeleteError(true);
    } finally {
      setDeleting(false);
    }
  };

  const handlePreview = () => {
    router.push(`/builder/${encodeURIComponent(resume.id)}`);
  };

  return (
    <>
      <ResumeDialog
        open={open}
        onOpenChange={toggleDialog}
        resume={resume}
        mode="edit"
        onSuccess={onEdit}
      />
      <AlertDialog open={deleteOpen} onOpenChange={nextOpen => { if (!deleting) setDeleteOpen(nextOpen); }}>
        <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); actionsButton.current?.focus(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resume?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes “{resume.title}”. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? <p role="alert" className="text-sm text-destructive">Could not delete this resume. Please try again.</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })} disabled={deleting}
              onClick={event => { event.preventDefault(); void handleDelete(); }}
            >{deleting ? 'Deleting…' : 'Delete resume'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{resume.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant={resume.visibility === 'public' ? 'default' : 'secondary'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {resume.visibility}
                  </Badge>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-100"
                  ref={actionsButton}
                  aria-label="Resume actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={toggleDialog}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {/* <DropdownMenuItem onClick={handlePreview}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => { setDeleteError(false); setDeleteOpen(true); }}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {resume.description || 'No description'}
          </p>
        </CardContent>

        <CardFooter className="pt-0 flex items-center justify-between">
          {/* 左侧：更新时间 */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Updated {formatDate(resume.updatedAt)}</span>
          </div>

          {/* 右下角：新增的预览按钮 */}
          <Button 
            variant="outline" 
            size="default" 
            className="h-8 gap-1.5 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={handlePreview}
          >
            <Eye className="h-3.5 w-3.5" />
            Open editor
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
