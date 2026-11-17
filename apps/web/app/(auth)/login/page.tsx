'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { WorkspaceBrand } from '@/components/WorkspaceBrand'
import styles from './login.module.css'
import { Link2, Loader2 } from 'lucide-react'

function GoogleLogin() {
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const connectingChatGpt = searchParams.has('sig') && searchParams.has('client_id')
  const oauthQuery = connectingChatGpt ? searchParams.toString() : ''

  const startLogin = async () => {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const result = await signIn.social({
        provider: 'google',
        callbackURL: oauthQuery ? `/oauth/consent?${oauthQuery}` : '/dashboard/resumes',
        errorCallbackURL: '/login?error=google',
        ...(oauthQuery ? { fetchOptions: { body: { oauth_query: oauthQuery } } } : {}),
      })
      if (result.error) setError('Could not start Google sign-in. Please try again.')
    } catch {
      setError('Could not start Google sign-in. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <WorkspaceBrand />
      </header>
      <main className={styles.grid}>
        <div className={styles.form}>
          <h1>Sign in</h1>
          {connectingChatGpt && <p>Sign in to review your ChatGPT connection.</p>}
          {(error || searchParams.has('error')) && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error ?? 'Google sign-in was not completed. Please try again.'}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full bg-white"
            size="lg"
            disabled={pending}
            onClick={startLogin}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 48 48" aria-hidden="true" className="size-4">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.2 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.43 38.03 46.98 31.88 46.98 24.55Z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.54 28.59a14.42 14.42 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19Z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
                />
              </svg>
            )}
            Continue with Google
          </Button>
        </div>
        <div className={styles.preview} aria-hidden="true">
          <Image src="/resume-templates/onyx.webp" alt="" width={794} height={1123} unoptimized />
          <div className={styles.note}>
            <span>
              <Link2 className="size-4" /> ChatGPT · Resume Copilot MCP
            </span>
            <p>Turn my Field Notes project into two resume bullets.</p>
          </div>
        </div>
      </main>
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
