import { z } from 'zod';

import { idSchema } from './id';

export const itemSchema = z.object({
  id: idSchema,
  visible: z.boolean().default(true),
});

export type Item = z.infer<typeof itemSchema>;

export const defaultItem: Item = {
  id: '',
  visible: true,
};
