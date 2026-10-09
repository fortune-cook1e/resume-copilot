import request from '@/lib/request'

// Better Auth's provider endpoints return plain JSON, not the business { data, error } envelope.
// Keep this fresh: the displayed account may have changed in another tab before consent.
export function getConsentSession(): Promise<unknown> {
  return request.getRaw('/auth/get-session', { headers: { 'Cache-Control': 'no-store' } })
}

export function submitMcpConsent(accept: boolean, oauthQuery: string): Promise<unknown> {
  return request.postRaw(
    '/auth/oauth2/consent',
    { accept, oauth_query: oauthQuery },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
