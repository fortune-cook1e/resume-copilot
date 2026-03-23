import Link from 'next/link';
import { FileText, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Search className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
          404
        </p>
        <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          We couldn&apos;t find the page you were looking for. It may have been moved or deleted.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="sm" asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/resume">
            <FileText className="mr-2 h-4 w-4" />
            Resume builder
          </Link>
        </Button>
      </div>
    </div>
  );
}
