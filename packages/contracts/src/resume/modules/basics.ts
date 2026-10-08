import { z } from 'zod';
import { defaultUrl, urlSchema } from '../common';

export const basicsSchema = z.object({
  name: z.string(),
  // Autosaved drafts may contain a partially entered email address.
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  website: urlSchema,
  headline: z.string(),
  picture: z.object({
    url: z.string(),
    size: z.number().default(64),
  }),
  customFields: z.array(urlSchema).default([]),
});

export type Basics = z.infer<typeof basicsSchema>;

export const defaultBasics: Basics = {
  name: '',
  email: '',
  phone: '',
  location: '',
  website: defaultUrl,
  headline: '',
  picture: {
    url: '',
    size: 64,
  },
  customFields: [],
};
