import request from '@/lib/request'
import {
  deletedResumeSchema,
  resumeAvatarSchema,
  resumeItemSchema,
  resumeSchema,
  type CreateResume,
  type UpdateResume,
  type Resume,
  type ResumeItem,
} from '@resume-copilot/contracts'

export async function uploadResumeAvatar(id: string, jpeg: string) {
  return resumeAvatarSchema.parse(await request.put(`/resumes/${id}/avatar`, { jpeg }))
}

export async function removeResumeAvatar(id: string) {
  return resumeAvatarSchema.parse(await request.delete(`/resumes/${id}/avatar`))
}

/** Get all resumes for the current user */
export async function getResumes(signal?: AbortSignal): Promise<ResumeItem[]> {
  return resumeItemSchema.array().parse(await request.get('/resumes', { signal }))
}

/** Get a single resume by ID */
export async function getResume(id: string): Promise<Resume> {
  return resumeSchema.parse(await request.get(`/resumes/${id}`))
}

/** Create a new resume */
export async function createResume(params: CreateResume): Promise<Resume> {
  return resumeSchema.parse(
    await request.post('/resumes', {
      title: params.title || 'Untitled Resume',
      description: params.description ?? '',
      ...(params.visibility ? { visibility: params.visibility } : {}),
      ...(params.data ? { data: params.data } : {}),
    }),
  )
}

/** Update an existing resume */
export async function updateResume(id: string, params: UpdateResume): Promise<Resume> {
  return resumeSchema.parse(await request.patch(`/resumes/${id}`, params))
}

/** Delete a resume by ID */
export async function deleteResume(id: string): Promise<{ id: string }> {
  return deletedResumeSchema.parse(await request.delete(`/resumes/${id}`))
}
