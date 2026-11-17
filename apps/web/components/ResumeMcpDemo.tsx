'use client'

import { useState } from 'react'
import { ArrowRight, Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ResumeMcpDemo() {
  const [showEdit, setShowEdit] = useState(true)

  return (
    <figure className="rounded-3xl border border-[#dedbd0] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">ChatGPT</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3c5744]">
          <Link2 aria-hidden="true" className="size-3.5" /> Resume Copilot MCP
        </span>
      </div>
      <blockquote className="mt-3 rounded-2xl rounded-tr-sm bg-[#f1efea] px-4 py-2.5 text-sm">
        Turn my Field Notes project into two resume bullets.
      </blockquote>
      <div className="mt-4 border-t border-[#ece8de] pt-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
          <span className="text-sm font-semibold">Field Notes</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-full text-xs"
            onClick={() => setShowEdit(!showEdit)}
          >
            {showEdit ? 'View original' : 'Show edit'} <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        <div aria-live="polite" className="min-h-20 text-sm leading-relaxed">
          {showEdit ? (
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 rounded-xl bg-[#e9f0e6] px-3 py-2 text-[#254535]">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Check aria-hidden="true" className="size-3.5" /> Resume updated
              </p>
              <ul className="mt-1 list-disc pl-4">
                <li>Built a searchable library for 80+ research interviews.</li>
                <li>Created reusable templates for three product teams.</li>
              </ul>
            </div>
          ) : (
            <p className="rounded-xl bg-[#f1efea] px-3 py-2">
              Worked on Field Notes, a research library with 80+ interviews and templates for three
              product teams.
            </p>
          )}
        </div>
      </div>
    </figure>
  )
}
