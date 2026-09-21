'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex h-screen flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Go home
              </Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
