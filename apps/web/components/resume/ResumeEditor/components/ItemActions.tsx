'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Copy, Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

interface ItemActionsProps {
  isVisible: boolean
  onToggleVisibility: () => void
  onEdit: () => void
  onRemove: () => void
  onDuplicate: () => void
}

export default function ItemActions({
  isVisible,
  onToggleVisibility,
  onEdit,
  onRemove,
  onDuplicate,
}: ItemActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="size-7 shrink-0 text-muted-foreground">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onToggleVisibility}>
          {isVisible ? (
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
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          <span>Edit</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRemove} className="text-red-600 focus:text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Remove</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
