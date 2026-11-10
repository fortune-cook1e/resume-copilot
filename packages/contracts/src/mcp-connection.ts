import { z } from 'zod'

export const mcpConnectionSchema = z.object({
  clientName: z.string(),
  scopes: z.array(
    z.enum([
      'resumes:read',
      'resumes:read_full',
      'resumes:write',
      'resumes:edit',
      'resumes:manage',
      'offline_access',
    ]),
  ),
})
