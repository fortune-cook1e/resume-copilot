import { z } from 'zod';

export const urlSchema = z.object({
  icon: z.string().default('Link'),
  label: z.string(),
  link: z.literal('').or(
    z.string().url({
      message: 'Url must start with https://',
    }),
  ),
});

export type URL = z.infer<typeof urlSchema>;

export const defaultUrl: URL = {
  icon: '',
  label: '',
  link: '',
};
