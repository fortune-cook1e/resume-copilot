import { createAuthClient } from 'better-auth/react'

// Browser and auth handler share an origin; the NestJS handler is reached through the API Worker binding.
export const authClient = createAuthClient()

export const { signIn, signOut, useSession } = authClient
