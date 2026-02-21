'use client';

import { cn } from '@/lib/utils';

interface LoadingProps {
  className?: string;
  text?: string;
}

export function Loading({ className, text = 'loading...' }: LoadingProps) {
  return (
    <div className={cn('flex h-screen items-center justify-center', className)}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">{text}</p>
      </div>
    </div>
  );
}
