'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import { clearAuthenticatedState, SESSION_CHANGE_KEY } from '@/lib/authenticated-state';

/** Server layouts guard initial navigation; this only reacts to later session changes. */
export function Authentication({ children, expectedUserId }: { children: ReactNode; expectedUserId?: string }) {
  const { data, isPending, error, refetch } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const identityChanged = !!(data?.user?.id && expectedUserId && data.user.id !== expectedUserId);
  const status = isPending ? 'pending' : error ? 'error' : identityChanged ? 'changed' : data ? 'valid' : 'missing';
  const [checkingNotice, setCheckingNotice] = useState(false);
  const [lastStatus, setLastStatus] = useState(status);
  const [invalidated, setInvalidated] = useState(status === 'missing' || status === 'changed');
  if (status !== lastStatus) {
    setLastStatus(status);
    if (status === 'missing' || status === 'changed') setInvalidated(true);
  }

  useEffect(() => {
    const onOtherTabUpdate = (event: StorageEvent) => {
      if (event.key !== SESSION_CHANGE_KEY || !event.newValue) return;
      setCheckingNotice(true);
      void Promise.resolve(refetch()).finally(() => setCheckingNotice(false));
    };
    window.addEventListener('storage', onOtherTabUpdate);
    return () => window.removeEventListener('storage', onOtherTabUpdate);
  }, [refetch]);

  useEffect(() => {
    if (isPending || error || (data && !identityChanged && !invalidated)) return;
    let active = true;
    void clearAuthenticatedState(queryClient).then(() => {
      if (!active) return;
      if (identityChanged) router.refresh();
      else router.replace('/login');
    });
    return () => { active = false; };
  }, [data, error, identityChanged, invalidated, isPending, queryClient, router]);

  if (error) return <main role="alert">Authentication temporarily unavailable. Refresh the page to retry.</main>;
  if (checkingNotice || invalidated || identityChanged || (!isPending && !data)) return null;
  return children;
}
