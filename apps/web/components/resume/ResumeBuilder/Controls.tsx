'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Controls({
  scale,
  onChange,
  onFit,
}: {
  scale: number
  onChange: (scale: number) => void
  onFit: () => void
}) {
  return (
    <div
      className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-background/95 p-1.5 shadow-sm backdrop-blur-sm"
      role="group"
      aria-label="Preview zoom"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom out"
        disabled={scale <= 0.2}
        onClick={() => onChange(scale - 0.1)}
      >
        <Minus />
      </Button>
      <Button variant="ghost" size="sm" aria-label="Fit page" onClick={onFit}>
        Fit
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom in"
        disabled={scale >= 2.5}
        onClick={() => onChange(scale + 0.1)}
      >
        <Plus />
      </Button>
      <span className="min-w-12 border-l px-2 text-center text-xs tabular-nums text-muted-foreground">
        {Math.round(scale * 100)}%
      </span>
    </div>
  )
}
