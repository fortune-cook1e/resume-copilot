'use client'

import { useId, useState } from 'react'
import {
  resumeFontFamilies,
  resumeTypographyStyleSchema,
  type ResumeTypographyStyle,
} from '@resume-copilot/contracts'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useResumeStore } from '@/stores/resume-store'
import { defaultResumeTypography } from './ResumeDocument/typography'

const groups = [
  { key: 'heading', label: 'Heading' },
  { key: 'body', label: 'Body' },
] as const

function TypographyNumber({
  label,
  value,
  field,
  onChange,
}: {
  label: string
  value: number
  field: 'fontSize' | 'lineHeight'
  onChange: (value: number) => void
}) {
  const [input, setInput] = useState<string | null>(null)
  const id = useId()
  const isSize = field === 'fontSize'
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        min={isSize ? 6 : 1}
        max={isSize ? 36 : 2.5}
        step="any"
        value={input ?? String(value)}
        onChange={(event) => {
          setInput(event.currentTarget.value)
          const next = resumeTypographyStyleSchema.shape[field].safeParse(
            event.currentTarget.valueAsNumber,
          )
          if (next.success && next.data !== undefined) onChange(next.data)
        }}
        onBlur={() => setInput(null)}
      />
    </Field>
  )
}

export default function ResumeTypography() {
  const typography = useResumeStore((state) => state.resume?.typography)
  const id = useId()
  return (
    <div className="space-y-6 p-6">
      <h2 className="font-semibold">Typography</h2>
      {groups.map(({ key, label }) => {
        const defaults = defaultResumeTypography[key]
        const style = typography?.[key]
        const fontId = `${id}-${key}-font`
        const update = <K extends keyof ResumeTypographyStyle>(
          field: K,
          value: ResumeTypographyStyle[K],
        ) =>
          useResumeStore.getState().updateResume((draft) => {
            draft.typography ??= {}
            draft.typography[key] ??= {}
            draft.typography[key][field] = value
          })
        return (
          <FieldSet key={key} className="gap-4 border-t border-border pt-3">
            <FieldLegend variant="label" className="mb-0 pr-3 font-semibold">
              {label}
            </FieldLegend>
            <Field className="gap-1.5">
              <FieldLabel id={`${fontId}-label`} htmlFor={fontId}>
                Font family
              </FieldLabel>
              <Select
                value={style?.fontFamily ?? defaults.fontFamily}
                onValueChange={(value) => {
                  const family = resumeFontFamilies.find((name) => name === value)
                  if (family) update('fontFamily', family)
                }}
              >
                <SelectTrigger id={fontId} aria-labelledby={`${fontId}-label`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resumeFontFamilies.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font === 'Times' ? 'Times New Roman' : font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <TypographyNumber
              label="Font size (pt)"
              field="fontSize"
              value={style?.fontSize ?? defaults.fontSize}
              onChange={(value) => update('fontSize', value)}
            />
            <TypographyNumber
              label="Line height"
              field="lineHeight"
              value={style?.lineHeight ?? defaults.lineHeight}
              onChange={(value) => update('lineHeight', value)}
            />
          </FieldSet>
        )
      })}
    </div>
  )
}
