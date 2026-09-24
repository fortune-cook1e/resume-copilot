import type { ConfigType } from '@nestjs/config';
import type { IncomingHttpHeaders } from 'node:http';
import { APIError, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { fromNodeHeaders } from 'better-auth/node';
import { appConfig } from '../config/app.config';
import { DatabaseService } from '../database/database.module';
import * as schema from '../database/schema';

type Auth = ReturnType<typeof betterAuth>;

export class AuthService {
  private constructor(readonly auth: Auth) {}

  static create(database: DatabaseService, config: ConfigType<typeof appConfig>) {
    const auth = betterAuth({
      baseURL: config.BETTER_AUTH_URL,
      basePath: '/api/auth',
      secret: config.BETTER_AUTH_SECRET,
      trustedOrigins: [config.BETTER_AUTH_URL],
      database: drizzleAdapter(database.db, { provider: 'pg', schema }),
      emailAndPassword: { enabled: false },
      socialProviders: {
        google: {
          clientId: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          scope: ['openid', 'email', 'profile'],
          mapProfileToUser: profile => {
            if (!profile.email_verified) throw new APIError('FORBIDDEN', { message: 'Verified Google email required' });
            return {};
          },
        },
      },
      account: { accountLinking: { disableImplicitLinking: true } },
      session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
      advanced: { useSecureCookies: new URL(config.BETTER_AUTH_URL).protocol === 'https:' },
    });
    return new AuthService(auth);
  }

  getSession(headers: IncomingHttpHeaders) {
    return this.auth.api.getSession({ headers: fromNodeHeaders(headers), query: { disableCookieCache: true } });
  }
}
