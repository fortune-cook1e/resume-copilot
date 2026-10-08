import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/current-user';

export default async function ResumePage({ searchParams }: {
  searchParams?: Promise<{ id?: string | string[] }>;
} = {}) {
  const { failure } = await getCurrentUser();
  if (failure?.status === 401) redirect('/login');
  if (failure) return <main role="alert">Authentication temporarily unavailable. Refresh the page to retry.</main>;

  const query = await searchParams;
  const resumeId = typeof query?.id === 'string' ? query.id : null;
  redirect(resumeId ? `/builder/${encodeURIComponent(resumeId)}` : '/dashboard/resumes');
}
