import { z } from 'zod';

export const urlSchema = z.object({
  icon: z.string().default('Link'),
  label: z.string(),
  // Autosaved drafts may contain a partially entered URL.
  link: z.string(),
});

export type URL = z.infer<typeof urlSchema>;

export const defaultUrl: URL = {
  icon: '',
  label: '',
  link: '',
};
