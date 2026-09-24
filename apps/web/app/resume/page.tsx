import { redirect } from 'next/navigation';
import ResumeWorkspace from '@/components/resume/ResumeWorkspace';
import { Authentication } from '@/components/authentication';
import { getCurrentUser } from '@/lib/current-user';

export default async function ResumePage() {
  const { user, failure } = await getCurrentUser();
  if (failure?.status === 401) redirect('/login');
  if (failure) return <main role="alert">Authentication temporarily unavailable. Refresh the page to retry.</main>;

  return <Authentication key={user.id} expectedUserId={user.id}><ResumeWorkspace /></Authentication>;
}
