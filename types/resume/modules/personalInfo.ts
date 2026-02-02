import { z } from 'zod';
import { defaultUrl, urlSchema } from '../common';

const customFieldSchema = z.object({
  icon: z.string().default('Link'),
  label: z.string(),
  link: z.literal('').or(z.string().url()),
});

export const PersonalInfoSchema = z.object({
  name: z.string(),
  email: z.literal('').or(z.string().email()),
  phone: z.string(),
  location: z.string(),
  website: urlSchema,
  headline: z.string(),
  picture: z.object({
    url: z.string(),
    size: z.number().default(64),
  }),
  customFields: z.array(customFieldSchema).default([]),
});

export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;

export const defaultPersonalInfo: PersonalInfo = {
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
