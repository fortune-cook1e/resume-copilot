'use client'

import { useEffect, useRef, useState } from 'react'
import { UserRound, X, ZoomIn, ZoomOut } from 'lucide-react'
import { resumeAvatarMaxBytes, resumeAvatarSize } from '@resume-copilot/contracts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { removeResumeAvatar, uploadResumeAvatar } from '@/services/resume'
import { useResumeStore } from '@/stores/resume-store'

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxInputBytes = 10 * 1024 * 1024
const size = resumeAvatarSize

export default function ResumeAvatar() {
  const id = useResumeStore((state) => state.resumeId)
  const avatar = useResumeStore((state) => state.avatar)
  const input = useRef<HTMLInputElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scale = bitmap ? (size / Math.min(bitmap.width, bitmap.height)) * zoom : 1
  const width = (bitmap?.width ?? size) * scale
  const height = (bitmap?.height ?? size) * scale

  useEffect(() => () => bitmap?.close(), [bitmap])

  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!bitmap || !context) return
    context.fillStyle = '#fff'
    context.fillRect(0, 0, size, size)
    context.drawImage(
      bitmap,
      (size - width) / 2 + offset.x,
      (size - height) / 2 + offset.y,
      width,
      height,
    )
  }, [bitmap, width, height, offset])

  const moveCrop = (x: number, y: number) => {
    const limitX = (width - size) / 2
    const limitY = (height - size) / 2
    setOffset((current) => ({
      x: Math.max(-limitX, Math.min(limitX, current.x + x)),
      y: Math.max(-limitY, Math.min(limitY, current.y + y)),
    }))
  }

  async function selectFile(file: File) {
    setError('')
    if (!allowedTypes.includes(file.type) || file.size > maxInputBytes) {
      setError('Choose a JPG, PNG, or WebP image up to 10 MB.')
      return
    }
    setBusy(true)
    try {
      const image = await createImageBitmap(file)
      setOffset({ x: 0, y: 0 })
      setZoom(1)
      setBitmap(image)
    } catch {
      setError('Could not open this image.')
    } finally {
      setBusy(false)
    }
  }

  async function savePhoto(remove = false) {
    if (!id || busy) return
    setBusy(true)
    setError('')
    try {
      let photo = null
      if (remove) photo = await removeResumeAvatar(id)
      else {
        const crop = canvas.current
        if (!crop) return
        let jpeg = ''
        for (const quality of [0.9, 0.75, 0.6, 0.45]) {
          jpeg = crop.toDataURL('image/jpeg', quality).split(',')[1] ?? ''
          if (jpeg && atob(jpeg).length <= resumeAvatarMaxBytes) break
          jpeg = ''
        }
        if (!jpeg) throw new Error('Image exceeds the avatar size limit.')
        photo = await uploadResumeAvatar(id, jpeg)
      }
      useResumeStore.getState().setAvatar(id, photo)
      setBitmap(null)
    } catch {
      setError(
        remove ? 'Could not remove the photo. Try again.' : 'Could not save the photo. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-16 space-y-2">
      <Input
        ref={input}
        type="file"
        aria-label="Resume photo"
        accept={allowedTypes.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void selectFile(file)
        }}
      />
      <div className="relative mx-auto w-fit">
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-16 cursor-pointer flex-col gap-1 rounded-md p-0 hover:bg-transparent hover:text-foreground"
          aria-label={avatar ? 'Replace photo' : 'Add photo'}
          disabled={busy || !id}
          onClick={() => input.current?.click()}
        >
          <Avatar className="size-14 transition-opacity hover:opacity-80">
            {avatar && (
              <AvatarImage src={avatar} alt="Current resume photo" className="object-cover" />
            )}
            <AvatarFallback className="bg-accent text-accent-foreground">
              <UserRound aria-hidden="true" className="size-6" />
            </AvatarFallback>
          </Avatar>
          {!avatar && <span className="text-[11px] text-muted-foreground">Add photo</span>}
        </Button>
        {avatar && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute -top-1 right-0 size-6 cursor-pointer rounded-full bg-background p-0 shadow-sm [&_svg]:size-3"
            aria-label="Remove photo"
            disabled={busy}
            onClick={() => void savePhoto(true)}
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      {!bitmap && error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Dialog
        open={!!bitmap}
        onOpenChange={(open) => {
          if (!open && !busy) setBitmap(null)
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crop photo</DialogTitle>
            <DialogDescription>
              Drag the image or use the arrow keys to position it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center rounded-md bg-neutral-950 px-4 py-3">
            <div className="relative w-64 max-w-full">
              <canvas
                ref={canvas}
                width={size}
                height={size}
                tabIndex={0}
                aria-label="Photo crop"
                className="block aspect-square w-full touch-none cursor-grab ring-1 ring-white/60 active:cursor-grabbing"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  pointer.current = { x: event.clientX, y: event.clientY }
                }}
                onPointerMove={(event) => {
                  if (!pointer.current) return
                  const ratio = size / event.currentTarget.clientWidth
                  moveCrop(
                    (event.clientX - pointer.current.x) * ratio,
                    (event.clientY - pointer.current.y) * ratio,
                  )
                  pointer.current = { x: event.clientX, y: event.clientY }
                }}
                onLostPointerCapture={() => {
                  pointer.current = null
                }}
                onKeyDown={(event) => {
                  const directions: Record<string, [number, number]> = {
                    ArrowUp: [0, -8],
                    ArrowDown: [0, 8],
                    ArrowLeft: [-8, 0],
                    ArrowRight: [8, 0],
                  }
                  const direction = directions[event.key]
                  if (!direction) return
                  event.preventDefault()
                  moveCrop(...direction)
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3"
              >
                {Array.from({ length: 9 }, (_, index) => (
                  <span key={index} className="border border-white/20" />
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Zoom</span>
              <span className="text-xs text-muted-foreground tabular-nums">{zoom.toFixed(1)}×</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <ZoomOut aria-hidden="true" className="size-4 shrink-0" />
              <Slider
                label="Zoom"
                min={1}
                max={3}
                step={0.01}
                value={[zoom]}
                disabled={busy}
                onValueChange={([nextZoom]) => {
                  const ratio = nextZoom / zoom
                  const limitX = (width * ratio - size) / 2
                  const limitY = (height * ratio - size) / 2
                  setOffset(({ x, y }) => ({
                    x: Math.max(-limitX, Math.min(limitX, x * ratio)),
                    y: Math.max(-limitY, Math.min(limitY, y * ratio)),
                  }))
                  setZoom(nextZoom)
                }}
              />
              <ZoomIn aria-hidden="true" className="size-4 shrink-0" />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setBitmap(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void savePhoto()}>
              Crop and upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
