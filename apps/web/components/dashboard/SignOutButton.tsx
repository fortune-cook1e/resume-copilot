'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { clearAuthenticatedState, SESSION_CHANGE_KEY } from '@/lib/authenticated-state'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()

  const handleSignOut = async () => {
    if (pending) return
    setPending(true)
    setFailure(false)
    try {
      const result = await signOut()
      if (result.error || !result.data?.success) {
        setFailure(true)
        setPending(false)
        return
      }
    } catch {
      setFailure(true)
      setPending(false)
      return
    }

    await clearAuthenticatedState(queryClient)
    try {
      // Other tabs recheck the server rather than trusting a storage event as proof of sign-out.
      localStorage.setItem(SESSION_CHANGE_KEY, String(Date.now()))
    } catch {
      /* Storage may be unavailable; focus-based revalidation remains available. */
    }
    router.replace('/login')
  }

  return (
    <div className="shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Sign out"
        disabled={pending}
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" />
      </Button>
      {failure && (
        <p role="alert" className="text-xs text-destructive">
          Could not sign out. Please retry.
        </p>
      )}
    </div>
  )
}
