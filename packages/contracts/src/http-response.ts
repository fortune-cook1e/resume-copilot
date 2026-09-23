import { z } from 'zod';
import { httpErrorSchema } from './http-error';

export const httpSuccessSchema = <T extends z.ZodType>(dataSchema: T) => z.strictObject({
  data: dataSchema,
  error: z.null(),
});

export const httpResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.union([httpSuccessSchema(dataSchema), httpErrorSchema]);

export type HttpSuccessResponse<T> = z.infer<ReturnType<typeof httpSuccessSchema<z.ZodType<T>>>>;
export type HttpResponse<T> = z.infer<ReturnType<typeof httpResponseSchema<z.ZodType<T>>>>;

export const pagerSchema = z.strictObject({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});

export type Pager = z.infer<typeof pagerSchema>;

export const paginatedDataSchema = <T extends z.ZodType>(itemSchema: T) => z.strictObject({
  items: z.array(itemSchema),
  pager: pagerSchema,
});

export type PaginatedData<T> = z.infer<ReturnType<typeof paginatedDataSchema<z.ZodType<T>>>>;
