'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { getConsentSession, submitMcpConsent } from '@/services/mcp-consent'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function Consent() {
  const router = useRouter()
  const params = useSearchParams()
  const { data: session, isPending } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const query = params.toString()
  const requestedScopes = params.get('scope')?.split(' ') ?? []
  const allowed =
    requestedScopes.length > 0 &&
    requestedScopes.every((scope) => ['connection:read', 'offline_access'].includes(scope))

  async function decide(accept: boolean) {
    if (busy || !session?.user || (accept && !allowed)) return
    setBusy(true)
    setError(null)
    try {
      // The displayed account may have changed in another tab since rendering.
      const latest = await getConsentSession()
      if (
        !latest ||
        typeof latest !== 'object' ||
        !('user' in latest) ||
        !latest.user ||
        typeof latest.user !== 'object' ||
        !('id' in latest.user) ||
        latest.user.id !== session.user.id
      )
        throw new Error('Account changed')
      const result = await submitMcpConsent(accept, query)
      if (
        !result ||
        typeof result !== 'object' ||
        !('url' in result) ||
        typeof result.url !== 'string'
      )
        throw new Error('Invalid response')
      // The provider validates the registered redirect URI; do not navigate to a
      // URL supplied directly by a query parameter on this page.
      window.location.assign(result.url)
    } catch {
      setError('Could not complete authorization. Please retry or cancel.')
      setBusy(false)
    }
  }

  if (isPending) return <p className="p-8">Checking your account…</p>
  if (!session?.user) {
    return (
      <div className="p-8">
        <p>Sign in to review this connection request.</p>
        <Button
          onClick={() => router.push(`/login?mcp_consent=${encodeURIComponent(`?${query}`)}`)}
        >
          Sign in with Google
        </Button>
      </div>
    )
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Resume Copilot</CardTitle>
          <CardDescription>Approve a new MCP connection for {session.user.name}?</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            This connection may read your account identifier, display name, and granted permissions.
            It cannot read your resumes or experiences.
          </p>
          <p className="mt-3 text-sm">
            Access lasts up to 30 days. This local trial does not yet offer a connection-management
            page.
          </p>
          {!allowed && (
            <p role="alert" className="mt-3 text-destructive">
              Unsupported or missing permission request.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-destructive">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" disabled={busy || !allowed} onClick={() => void decide(true)}>
            Allow
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void decide(false)}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading authorization…</p>}>
      <Consent />
    </Suspense>
  )
}
