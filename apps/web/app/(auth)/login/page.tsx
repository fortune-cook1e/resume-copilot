'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

function GoogleLogin() {
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startLogin = async () => {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const result = await signIn.social({
        provider: 'google',
        callbackURL: '/dashboard/resumes',
        errorCallbackURL: '/login?error=google',
      })
      if (result.error) setError('Could not start Google sign-in. Please try again.')
    } catch {
      setError('Could not start Google sign-in. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>Continue to Resume Copilot with your Google account</CardDescription>
        </CardHeader>
        <CardContent>
          {(error || searchParams.has('error')) && (
            <p
              role="alert"
              className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error ?? 'Google sign-in was not completed. Please try again.'}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={pending}
            onClick={startLogin}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Continue with Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <GoogleLogin />
    </Suspense>
  )
}
