import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

const isProduction = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  advanced: {
    cookies: {
      session_token: {
        name: 'better-auth.session_token',
        attributes: {
          secure: isProduction,
        },
      },
      session_data: {
        name: 'better-auth.session_data',
        attributes: {
          secure: isProduction,
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true, // To enable email and password authentication
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in database
    updateAge: 60 * 60 * 24, // update session every 24 hours

    // Enable cookie caching to reduce database load for session validation
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache, after which it will revalidate with the database
    },
  },
});

export type Session = typeof auth.$Infer.Session;
