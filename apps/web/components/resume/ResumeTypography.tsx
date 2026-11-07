'use client'

import { Check } from 'lucide-react'
import {
  resumeTextSize,
  resumeTypographyPresetIds,
  type ResumeTypographyPresetId,
} from '@resume-copilot/contracts'
import { Button } from '@/components/ui/button'
import { FieldLegend, FieldSet } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import { useResumeStore } from '@/stores/resume-store'
import { typographyPresets } from './ResumeDocument/typography'

export default function ResumeTypography() {
  const typography = useResumeStore((state) => state.resume?.typography)
  const savedStyles = typography && !typography.preset && (typography.heading || typography.body)
  const preset = typography?.preset ?? (savedStyles ? undefined : 'classic')
  const textSize = typography?.textSize ?? resumeTextSize.default

  const update = (preset: ResumeTypographyPresetId, textSize: number) =>
    useResumeStore.getState().updateResume((draft) => {
      draft.typography = { preset, textSize }
    })

  return (
    <div className="space-y-6">
      <FieldSet className="gap-2">
        <FieldLegend>Typography</FieldLegend>
        {resumeTypographyPresetIds.map((id) => {
          const { label, heading, body } = typographyPresets[id]
          const selected = id === preset
          return (
            <Button
              key={id}
              type="button"
              variant="outline"
              aria-pressed={selected}
              className="h-auto min-h-12 w-full justify-start gap-x-2 gap-y-1 whitespace-normal px-3 py-2 text-left aria-pressed:border-primary aria-pressed:bg-primary/5"
              onClick={() => update(id, textSize)}
            >
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                <span>{label}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {heading === body ? heading : `${heading} + ${body}`}
                </span>
              </span>
              {selected && <Check aria-hidden="true" className="text-primary" />}
            </Button>
          )
        })}
      </FieldSet>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium">Text size</span>
          {preset && <span className="tabular-nums text-muted-foreground">{textSize} pt</span>}
        </div>
        <Slider
          label="Text size"
          min={resumeTextSize.min}
          max={resumeTextSize.max}
          step={resumeTextSize.step}
          disabled={!preset}
          value={[textSize]}
          onValueChange={([size]) => {
            if (preset) update(preset, size)
          }}
        />
        {!preset && (
          <p className="text-xs text-muted-foreground">
            Your saved typography is active. Choose a preset to adjust text size.
          </p>
        )}
      </div>
    </div>
  )
}
