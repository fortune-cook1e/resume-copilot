import {
  resumeTextSize,
  type ResumeData,
  type ResumeTypographyPresetId,
} from '@resume-copilot/contracts'

export const typographyPresets = {
  classic: { label: 'Classic', heading: 'EB Garamond', body: 'EB Garamond' },
  traditional: { label: 'Traditional', heading: 'Tinos', body: 'Tinos' },
  balanced: { label: 'Balanced', heading: 'Source Serif 4', body: 'Source Sans 3' },
  professional: { label: 'Professional', heading: 'Carlito', body: 'Carlito' },
  clean: { label: 'Clean', heading: 'Lato', body: 'Lato' },
} as const satisfies Record<
  ResumeTypographyPresetId,
  { label: string; heading: string; body: string }
>

export function resolveResumeTypography(typography: ResumeData['typography']) {
  const preset = typographyPresets[typography?.preset ?? 'classic']
  const textSize = typography?.textSize ?? resumeTextSize.default
  const heading = { fontFamily: preset.heading, fontSize: textSize * 1.4, lineHeight: 1.25 }
  const body = { fontFamily: preset.body, fontSize: textSize, lineHeight: 1.5 }

  return typography?.preset
    ? { heading, body }
    : {
        heading: { ...heading, ...typography?.heading },
        body: { ...body, ...typography?.body },
      }
}
