import { headers } from 'next/headers';
import { currentUserSchema, httpResponseSchema, type CurrentUser } from '@resume-copilot/contracts';
import { error } from '@/lib/api-response';

const unavailable = () => ({ user: null, failure: error('Authentication unavailable', 503) });

/** Only the API can establish identity; browser-supplied user IDs never prove ownership. */
export async function getCurrentUser(): Promise<
  { user: CurrentUser; failure: null } | { user: null; failure: ReturnType<typeof error> }
> {
  const cookie = (await headers()).get('cookie');
  if (!cookie) return { user: null, failure: error('Unauthorized', 401) };

  try {
    const response = await fetch(new URL('/api/me', process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001'), {
      headers: { cookie },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (response.status === 401) return { user: null, failure: error('Unauthorized', 401) };
    if (!response.ok) return unavailable();

    const result = httpResponseSchema(currentUserSchema).safeParse(await response.json());
    if (!result.success || !result.data.data) return unavailable();
    return { user: result.data.data, failure: null };
  } catch {
    return unavailable();
  }
}
