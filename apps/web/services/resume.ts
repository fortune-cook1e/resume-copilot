import request from '@/lib/request';
import {
  deletedResumeSchema, resumeItemSchema, resumeSchema,
  type CreateResume, type UpdateResume, type Resume, type ResumeItem,
} from '@resume-copilot/contracts';

/** Get all resumes for the current user */
export async function getResumes(signal?: AbortSignal): Promise<ResumeItem[]> {
  return resumeItemSchema.array().parse(await request.get('/resumes', { signal }));
}

/** Get a single resume by ID */
export async function getResume(id: string): Promise<Resume> {
  return resumeSchema.parse(await request.get(`/resumes/${id}`));
}

/** Create a new resume */
export async function createResume(params: CreateResume): Promise<Resume> {
  return resumeSchema.parse(await request.post('/resumes', {
    title: params.title || 'Untitled Resume',
    description: params.description ?? '',
    ...(params.visibility ? { visibility: params.visibility } : {}),
    ...(params.data ? { data: params.data } : {}),
  }));
}

/** Update an existing resume */
export async function updateResume(id: string, params: UpdateResume): Promise<Resume> {
  return resumeSchema.parse(await request.patch(`/resumes/${id}`, params));
}

/** Delete a resume by ID */
export async function deleteResume(id: string): Promise<{ id: string }> {
  return deletedResumeSchema.parse(await request.delete(`/resumes/${id}`));
}

/** Export a resume as PDF (returns Blob) */
export async function exportResumePDF(title: string, resumeId: string): Promise<Blob> {
  const data = (await request.post(
    '/export-pdf',
    { title, resumeId },
    {
      responseType: 'blob',
      timeout: 120000,
    },
  )) as unknown as Blob;
  return data;
}
