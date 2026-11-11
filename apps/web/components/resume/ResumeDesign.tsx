'use client'

import { useId, useState } from 'react'
import { resumeTemplateSchema, resumeThemeColorSchema } from '@resume-copilot/contracts'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { useResumeStore } from '@/stores/resume-store'
import ResumeTypography from './ResumeTypography'
import { densityPresets, resolveThemeColor, themeColors } from './ResumeDocument/design'

const templateNames = {
  onyx: 'Onyx',
  meowth: 'Meowth',
  kakuna: 'Kakuna',
  scizor: 'Scizor',
} as const

export default function ResumeDesign() {
  const template = useResumeStore((state) => state.resume?.design?.template ?? 'onyx')
  const density = useResumeStore((state) => state.resume?.design?.density ?? 'normal')
  const themeColor = useResumeStore((state) => state.resume?.design?.themeColor ?? 'blue')
  const [typedColor, setTypedColor] = useState<string | null>(null)
  const colorId = useId()
  const color = resolveThemeColor(themeColor)
  const inputColor = typedColor ?? color.toUpperCase()
  const normalized = `#${inputColor.replace(/^#/, '')}`.toUpperCase()
  const validColor = resumeThemeColorSchema.safeParse(normalized).success
  return (
    <div className="space-y-6 p-6">
      <FieldSet className="gap-3">
        <FieldLegend>Template</FieldLegend>
        <div className="grid grid-cols-2 gap-3">
          {resumeTemplateSchema.options.map((id) => (
            <Button
              key={id}
              variant="outline"
              aria-label={templateNames[id]}
              aria-pressed={template === id}
              className="h-auto flex-col gap-3 p-3 aria-pressed:border-primary aria-pressed:bg-primary/5"
              onClick={() =>
                useResumeStore.getState().updateResume((draft) => {
                  draft.design ??= {}
                  draft.design.template = id
                })
              }
            >
              <span
                aria-hidden="true"
                className="flex aspect-[210/220] w-full flex-col gap-2 overflow-hidden rounded-sm border bg-white p-3 shadow-sm"
              >
                {id === 'scizor' && <span className="-mx-3 -mt-3 border-t-2 border-sky-600" />}
                <span
                  className={`h-1.5 w-2/3 rounded bg-neutral-800 ${id === 'kakuna' ? 'self-center' : ''}`}
                />
                {id === 'scizor' && <span className="w-[72%] border-b border-neutral-300" />}
                <span
                  className={`h-1 w-1/2 rounded bg-neutral-300 ${id === 'kakuna' ? 'self-center' : ''}`}
                />
                {id === 'onyx' && <span className="border-b border-sky-600" />}
                {[0, 1, 2].map((row) => (
                  <span key={row} className="flex flex-col gap-1.5">
                    {id === 'scizor' && <span className="border-t border-neutral-300" />}
                    <span
                      className={
                        id === 'meowth'
                          ? 'h-1 w-full border-b border-sky-600'
                          : id === 'kakuna'
                            ? 'h-1 w-1/3 self-center bg-sky-600'
                            : 'h-1 w-1/3 bg-neutral-600'
                      }
                    />
                    {id === 'kakuna' && <span className="border-b border-sky-600" />}
                    <span className="h-1 w-full bg-neutral-200" />
                    <span className="h-1 w-5/6 bg-neutral-200" />
                  </span>
                ))}
              </span>
              <span className="flex w-full items-center justify-between">
                {templateNames[id]}
                {template === id && <Check aria-hidden="true" className="size-4" />}
              </span>
            </Button>
          ))}
        </div>
      </FieldSet>
      <Separator />
      <ResumeTypography />
      <Separator />
      <FieldSet className="gap-3">
        <FieldLegend>Density</FieldLegend>
        <div className="flex gap-1">
          {(['compact', 'normal', 'roomy'] as const).map((id) => (
            <Button
              key={id}
              variant="outline"
              aria-pressed={density === id}
              className="min-w-0 flex-1 px-2 aria-pressed:border-primary aria-pressed:bg-primary/5"
              onClick={() =>
                useResumeStore.getState().updateResume((draft) => {
                  draft.design ??= {}
                  draft.design.density = id
                })
              }
            >
              {densityPresets[id].label}
            </Button>
          ))}
        </div>
      </FieldSet>
      <Separator />
      <FieldSet className="gap-3">
        <FieldLegend>Theme color</FieldLegend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {(Object.keys(themeColors) as (keyof typeof themeColors)[]).map((id) => (
            <Button
              key={id}
              variant="outline"
              size="icon"
              aria-label={themeColors[id].label}
              title={themeColors[id].label}
              aria-pressed={themeColor === id}
              style={{ backgroundColor: themeColors[id].hex }}
              className="aspect-square h-auto w-full rounded-full border-2 border-transparent text-white hover:opacity-90 aria-pressed:ring-2 aria-pressed:ring-ring aria-pressed:ring-offset-2"
              onClick={() => {
                setTypedColor(null)
                useResumeStore.getState().updateResume((draft) => {
                  draft.design ??= {}
                  draft.design.themeColor = id
                })
              }}
            >
              {themeColor === id && <Check aria-hidden="true" className="size-4" />}
            </Button>
          ))}
        </div>
        <Field className="gap-1.5">
          <FieldLabel htmlFor={colorId}>HEX color</FieldLabel>
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-9 shrink-0 rounded-md border"
              style={{ backgroundColor: color }}
            />
            <Input
              id={colorId}
              value={inputColor}
              placeholder="#2563EB"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={!validColor}
              aria-describedby={!validColor ? `${colorId}-error` : undefined}
              className="font-mono"
              onChange={(event) => {
                const value = event.currentTarget.value
                setTypedColor(value)
                const parsed = resumeThemeColorSchema.safeParse(
                  `#${value.replace(/^#/, '')}`.toUpperCase(),
                )
                if (parsed.success)
                  useResumeStore.getState().updateResume((draft) => {
                    draft.design ??= {}
                    draft.design.themeColor = parsed.data
                  })
              }}
              onBlur={() => setTypedColor(null)}
            />
          </div>
          {!validColor && (
            <FieldError id={`${colorId}-error`}>Enter six HEX digits, such as #2563EB.</FieldError>
          )}
        </Field>
      </FieldSet>
      <Separator />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          setTypedColor(null)
          useResumeStore.getState().updateResume((draft) => {
            delete draft.design
            delete draft.typography
          })
        }}
      >
        <RotateCcw />
        Reset design
      </Button>
    </div>
  )
}
