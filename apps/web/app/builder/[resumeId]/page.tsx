import { redirect } from 'next/navigation';
import { Authentication } from '@/components/authentication';
import ResumeWorkspace from '@/components/resume/ResumeWorkspace';
import { getCurrentUser } from '@/lib/current-user';

export default async function BuilderPage({ params }: { params: Promise<{ resumeId: string }> }) {
  const { user, failure } = await getCurrentUser();
  if (failure?.status === 401) redirect('/login');
  if (failure) return <main role="alert">Authentication temporarily unavailable. Refresh the page to retry.</main>;
  const { resumeId } = await params;

  return (
    <Authentication key={user.id} expectedUserId={user.id}>
      <ResumeWorkspace key={resumeId} resumeId={resumeId} />
    </Authentication>
  );
}
