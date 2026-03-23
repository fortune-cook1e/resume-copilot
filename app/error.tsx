'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <AlertTriangle className="h-7 w-7 text-amber-500" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">We hit a snag</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Something went wrong while loading this page. Give it another try or head back to a
          safe place.
        </p>
        {error.digest && <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button size="sm" asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
