import { FC, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { URL } from '@resume-copilot/contracts'

interface Props {
  url: URL
  icon?: ReactNode
  label?: string
  classname?: string
  projectLink?: boolean
}

export function projectWebsiteHref(value: string) {
  const url = URL.parse(value.trim())
  return url && (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : undefined
}

// Tip: // ph ph-bold classes come from https://github.com/phosphor-icons/web
const Link: FC<Props> = ({ url, icon, label, classname, projectLink }) => {
  if (!url.link) return null

  return (
    <div
      className="flex items-center gap-x-1.5"
      data-project-link={projectLink ? url.link : undefined}
    >
      {icon ?? <i className="ph ph-bold ph-link text-primary" />}
      <a
        href={url.link}
        target="_blank"
        rel="noreferrer noopener nofollow"
        className={cn('inline-block', classname)}
      >
        {label || url.label || url.link}
      </a>
    </div>
  )
}

export default Link
