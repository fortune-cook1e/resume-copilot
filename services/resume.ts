import request from '@/lib/request';
import type { Resume, ResumeData, ResumeVisibility, ResumeItem } from '@/types/resume';

export interface CreateResumeParams {
  title?: string;
  description?: string;
  visibility?: ResumeVisibility;
  data?: ResumeData;
}

export interface UpdateResumeParams {
  title?: string;
  description?: string;
  data?: ResumeData;
  visibility?: ResumeVisibility;
}

/** Get all resumes for the current user */
export async function getResumes(): Promise<ResumeItem[]> {
  return (await request.get('/resumes')) as unknown as ResumeItem[];
}

/** Get a single resume by ID */
export async function getResume(id: string): Promise<Resume> {
  return (await request.get(`/resumes/${id}`)) as unknown as Resume;
}

/** Create a new resume */
export async function createResume(params: CreateResumeParams): Promise<Resume> {
  return (await request.post('/resumes', {
    title: params.title || 'Untitled Resume',
    description: params.description ?? '',
    ...(params.data ? { data: params.data } : {}),
  })) as unknown as Resume;
}

/** Update an existing resume */
export async function updateResume(id: string, params: UpdateResumeParams): Promise<Resume> {
  return (await request.patch(`/resumes/${id}`, params)) as unknown as Resume;
}

/** Delete a resume by ID */
export async function deleteResume(id: string): Promise<{ id: string }> {
  return (await request.delete(`/resumes/${id}`)) as unknown as { id: string };
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
