import { z } from 'zod';
import { defaultUrl, urlSchema } from '../common';

export const PersonalInfoSchema = z.object({
  name: z.string(),
  email: z.literal('').or(z.string().email()),
  phone: z.string(),
  location: z.string(),
  url: urlSchema,
  headline: z.string(),
  gender: z.enum(['male', 'female', 'other']).default('male'),
  picture: z.object({
    url: z.string(),
    size: z.number().default(32),
  }),
});

export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;

export const defaultPersonalInfo: PersonalInfo = {
  name: '',
  email: '',
  phone: '',
  location: '',
  url: defaultUrl,
  gender: 'female',
  headline: '',
  picture: {
    url: '',
    size: 64,
  },
};
