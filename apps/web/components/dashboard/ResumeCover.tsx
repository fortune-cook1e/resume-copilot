'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ResumeItem } from '@resume-copilot/contracts'
import { FileText } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { getResume } from '@/services/resume'
import { Skeleton } from '@/components/ui/skeleton'
import styles from './resume-cover.module.css'

export function ResumeCover({ resume }: { resume: ResumeItem }) {
  const ref = useRef<HTMLDivElement>(null)
  const [nearby, setNearby] = useState(false)
  const { data: session } = useSession()
  const userId = session?.user.id

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearby(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px' },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  // Account identity and saved revision own the cached image. Sign-out clears the cache.
  const { data: image, isError } = useQuery({
    queryKey: ['resume-thumbnail', userId, resume.id, resume.updatedAt],
    enabled: nearby && !!userId,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async ({ signal }) => {
      const { enqueueThumbnail, renderThumbnail } = await import('./resume-thumbnail')
      return enqueueThumbnail(async () => {
        const detail = await getResume(resume.id, signal)
        return renderThumbnail(detail, signal)
      }, signal)
    },
  })

  return (
    <div ref={ref} className={styles.cover} aria-hidden="true">
      {image ? (
        // Generated locally from the same PDF as the editor and export.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className={styles.image} />
      ) : isError ? (
        <FileText className="size-7 text-neutral-400" />
      ) : (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
    </div>
  )
}
