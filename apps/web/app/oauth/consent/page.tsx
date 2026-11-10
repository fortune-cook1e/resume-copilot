'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { authClient, useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function ChatGptConsent() {
  const query = useSearchParams()
  const { data: session, isPending } = useSession()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const scopes = query.get('scope')?.split(' ') ?? []
  const canRead = scopes.includes('resumes:read')
  const canReadFullResume = scopes.includes('resumes:read_full')
  const canWrite = scopes.includes('resumes:write')
  const canEdit = scopes.includes('resumes:edit')
  const canManage = scopes.includes('resumes:manage')
  const valid =
    query.has('sig') &&
    (canRead || canReadFullResume || canWrite || canEdit || canManage) &&
    scopes.every((scope) =>
      [
        'resumes:read',
        'resumes:read_full',
        'resumes:write',
        'resumes:edit',
        'resumes:manage',
        'offline_access',
      ].includes(scope),
    )
  const canRespond = valid && Boolean(session?.user) && !pending

  async function respond(accept: boolean) {
    if (!canRespond) return
    setPending(true)
    setError(false)
    try {
      const current = await authClient.getSession({ query: { disableCookieCache: true } })
      if (!current.data?.user || current.data.user.id !== session?.user.id)
        throw new Error('Account changed')
      // Better Auth validates the signed authorization request and the registered redirect.
      const result = await authClient.$fetch<{ url: string }>('/oauth2/consent', {
        method: 'POST',
        body: { accept, oauth_query: query.toString() },
      })
      if (!result.data?.url) throw new Error('Missing authorization redirect')
      window.location.assign(result.data.url)
    } catch {
      setError(true)
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>Connect ChatGPT</h1>
          </CardTitle>
          {session?.user && <CardDescription>Signed in as {session.user.email}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {canReadFullResume && (
            <p>Allow ChatGPT to read full resumes in your account, including contact details.</p>
          )}
          {canRead && !canReadFullResume && (
            <p>Allow ChatGPT to read resume titles and selected content in your account.</p>
          )}
          {canWrite && (
            <p>
              Allow ChatGPT to create private resumes and edit selected resume text in your account.
            </p>
          )}
          {canEdit && (
            <p>
              Allow ChatGPT to edit your resumes, including contact details, sections, and design.
            </p>
          )}
          {canManage && (
            <p>
              Allow ChatGPT to change resume names, descriptions, and visibility settings, and to
              copy or permanently delete resumes in your account.
            </p>
          )}
          {scopes.includes('offline_access') && (
            <p>ChatGPT can renew this access after you close this page.</p>
          )}
          {isPending && <p role="status">Checking your account…</p>}
          {!isPending && !session?.user && (
            <p role="alert">Sign in again from the ChatGPT connection prompt.</p>
          )}
          {!valid && (
            <p role="alert">This connection request is incomplete. Restart it in ChatGPT.</p>
          )}
          {error && (
            <p role="alert">Could not complete authorization. Start a new request in ChatGPT.</p>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" disabled={!canRespond} onClick={() => void respond(true)}>
            Allow access
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canRespond}
            onClick={() => void respond(false)}
          >
            Deny
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<p role="status">Loading authorization…</p>}>
      <ChatGptConsent />
    </Suspense>
  )
}
