import { getCloudflareContext } from '@opennextjs/cloudflare'
import { headers } from 'next/headers'
import { currentUserSchema, httpResponseSchema, type CurrentUser } from '@resume-copilot/contracts'
import { error } from '@/lib/api-response'

const unavailable = () => ({ user: null, failure: error('Authentication unavailable', 503) })

/** Only the API can establish identity; browser-supplied user IDs never prove ownership. */
export async function getCurrentUser(): Promise<
  { user: CurrentUser; failure: null } | { user: null; failure: ReturnType<typeof error> }
> {
  const cookie = (await headers()).get('cookie')
  if (!cookie) return { user: null, failure: error('Unauthorized', 401) }

  try {
    const init = {
      headers: { cookie },
      cache: 'no-store' as const,
      signal: AbortSignal.timeout(3000),
    }
    const response =
      process.env.NODE_ENV === 'development'
        ? await fetch(
            new URL('/api/me', process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001'),
            init,
          )
        : await getCloudflareContext().env.API.fetch(
            new Request('https://api.internal/api/me', init),
          )
    if (response.status === 401) return { user: null, failure: error('Unauthorized', 401) }
    if (!response.ok) return unavailable()

    const result = httpResponseSchema(currentUserSchema).safeParse(await response.json())
    if (!result.success || !result.data.data) return unavailable()
    return { user: result.data.data, failure: null }
  } catch {
    return unavailable()
  }
}
