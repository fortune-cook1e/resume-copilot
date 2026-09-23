import { z } from 'zod';

export const httpErrorSchema = z.strictObject({
  data: z.null(),
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
  }),
});

export type HttpErrorResponse = z.infer<typeof httpErrorSchema>;
