import { z } from 'zod'

export const currentUserSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  email: z.email(),
})

export type CurrentUser = z.infer<typeof currentUserSchema>
