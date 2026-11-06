import type { ResumeTypographyStyle } from '@resume-copilot/contracts'

export const defaultResumeTypography = {
  heading: { fontFamily: 'EB Garamond', fontSize: 14, lineHeight: 1.25 },
  body: { fontFamily: 'EB Garamond', fontSize: 10, lineHeight: 1.5 },
} satisfies Record<'heading' | 'body', Required<ResumeTypographyStyle>>
