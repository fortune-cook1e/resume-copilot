import type { ConfigType } from '@nestjs/config'
import type { IncomingHttpHeaders } from 'node:http'
import { APIError, betterAuth } from 'better-auth'
import { oauthProvider, oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto'
import { fromNodeHeaders } from 'better-auth/node'
import { and, eq, isNull, ne, or } from 'drizzle-orm'
import { appConfig } from '../config/app.config'
import { DatabaseService } from '../database/database.module'
import * as schema from '../database/schema'
import {
  MCP_PATH,
  RESUME_EDIT_SCOPE,
  RESUME_FULL_READ_SCOPE,
  RESUME_MANAGE_SCOPE,
  RESUME_READ_SCOPE,
  RESUME_WRITE_SCOPE,
} from '../mcp/protocol'
import { hashMcpToken, type McpConnectionsService } from './mcp-connections.service'

type AppConfig = ConfigType<typeof appConfig>
type AuthBoundary = Pick<ReturnType<typeof betterAuth>, 'handler'> & {
  api: Pick<ReturnType<typeof betterAuth>['api'], 'getSession'> & {
    getOAuthServerConfig(options: { request: Request; asResponse: false }): Promise<unknown>
    oauth2Introspect(options: {
      body: {
        token: string
        token_type_hint: 'access_token'
        client_id: string
        client_secret: string
      }
    }): Promise<Record<string, unknown>>
  }
}
const mcpScopes = [
  RESUME_READ_SCOPE,
  RESUME_FULL_READ_SCOPE,
  RESUME_WRITE_SCOPE,
  RESUME_EDIT_SCOPE,
  RESUME_MANAGE_SCOPE,
  'offline_access',
]
const grantTypes = ['authorization_code', 'refresh_token'] as const

function invalidGrant() {
  return new APIError('BAD_REQUEST', {
    error: 'invalid_grant',
    error_description: 'Connection is inactive',
  })
}

function createAuth(
  database: DatabaseService,
  config: AppConfig,
  connections: McpConnectionsService,
): AuthBoundary {
  return betterAuth({
    baseURL: config.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [config.BETTER_AUTH_URL],
    database: drizzleAdapter(database.db, { provider: 'sqlite', schema }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        scope: ['openid', 'email', 'profile'],
        mapProfileToUser: (profile) => {
          if (!profile.email_verified)
            throw new APIError('FORBIDDEN', { message: 'Verified Google email required' })
          return {}
        },
      },
    },
    account: { accountLinking: { disableImplicitLinking: true } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: { useSecureCookies: new URL(config.BETTER_AUTH_URL).protocol === 'https:' },
    disabledPaths: ['/oauth2/delete-consent', '/oauth2/update-consent'],
    plugins: config.MCP_CLIENT_ID
      ? [
          oauthProvider({
            loginPage: '/login',
            consentPage: '/oauth/consent',
            scopes: mcpScopes,
            validAudiences: [config.BETTER_AUTH_URL + MCP_PATH],
            grantTypes: [...grantTypes],
            disableJwtPlugin: true,
            allowDynamicClientRegistration: false,
            clientPrivileges: async () => false,
            resourcePrivileges: async () => false,
            storeTokens: { hash: hashMcpToken },
            postLogin: {
              page: '/oauth/consent',
              shouldRedirect: async () => false,
              consentReferenceId: async ({ user }) =>
                (await connections.getReference(user.id)) ?? crypto.randomUUID(),
            },
            extensions: [
              { claims: { accessToken: ({ referenceId }) => ({ mcp_grant: referenceId }) } },
            ],
            customTokenResponseFields: async ({ grantType, verificationValue, user }) => {
              if (grantType === 'authorization_code') {
                const reference = verificationValue?.referenceId
                if (
                  !user ||
                  typeof reference !== 'string' ||
                  !(await connections.isActive(user.id, reference))
                )
                  throw invalidGrant()
              }
              return {}
            },
          }),
          {
            id: 'mcp-refresh-grant',
            hooks: {
              before: [
                {
                  matcher: (context) =>
                    context.path === '/oauth2/token' &&
                    context.body?.grant_type === 'refresh_token',
                  handler: createAuthMiddleware(async (context) => {
                    const token: unknown = context.body?.refresh_token
                    if (typeof token !== 'string' || !(await connections.hasRefreshGrant(token)))
                      throw invalidGrant()
                  }),
                },
              ],
            },
          },
        ]
      : [],
  })
}

async function configureMcpClient(database: DatabaseService, config: AppConfig) {
  const { MCP_CLIENT_ID: clientId, MCP_CLIENT_SECRET: secret, MCP_REDIRECT_URI: redirect } = config
  if (!clientId || !secret || !redirect) return
  const { oauthClient } = schema
  const identifier = config.BETTER_AUTH_URL + MCP_PATH
  const scopes = JSON.stringify(mcpScopes)
  await database.db
    .insert(schema.oauthResource)
    .values({
      id: identifier,
      identifier,
      name: 'Resume Copilot MCP',
      allowedScopes: scopes,
    })
    .onConflictDoUpdate({
      target: schema.oauthResource.identifier,
      set: { allowedScopes: scopes },
      setWhere: or(
        isNull(schema.oauthResource.allowedScopes),
        ne(schema.oauthResource.allowedScopes, scopes),
      ),
    })
  const [stored] = await database.db
    .select({
      clientSecret: oauthClient.clientSecret,
      redirectUris: oauthClient.redirectUris,
      scopes: oauthClient.scopes,
    })
    .from(oauthClient)
    .where(eq(oauthClient.clientId, clientId))
    .limit(1)
  const redirectUris = JSON.stringify([redirect])
  const key = config.BETTER_AUTH_SECRET
  const previousSecret = stored?.clientSecret
    ? await symmetricDecrypt({ key, data: stored.clientSecret }).catch(() => null)
    : null
  if (
    previousSecret !== secret ||
    stored?.redirectUris !== redirectUris ||
    stored?.scopes !== scopes
  ) {
    const registration = {
      name: 'ChatGPT',
      clientSecret: await symmetricEncrypt({ key, data: secret }),
      redirectUris,
      scopes,
      grantTypes: JSON.stringify(grantTypes),
      responseTypes: JSON.stringify(['code']),
      requirePKCE: true,
      tokenEndpointAuthMethod: 'client_secret_post',
      updatedAt: new Date(),
    }
    await database.db
      .insert(oauthClient)
      .values({ id: clientId, clientId, createdAt: registration.updatedAt, ...registration })
      .onConflictDoUpdate({ target: oauthClient.clientId, set: registration })
  }
  const { oauthClientResource } = schema
  await database.db.batch([
    database.db
      .delete(oauthClientResource)
      .where(
        and(
          eq(oauthClientResource.resourceId, identifier),
          ne(oauthClientResource.clientId, clientId),
        ),
      ),
    database.db
      .insert(oauthClientResource)
      .values({ id: crypto.randomUUID(), clientId, resourceId: identifier })
      .onConflictDoNothing(),
  ])
}

export class AuthService {
  private constructor(
    readonly auth: ReturnType<typeof createAuth>,
    private readonly config: AppConfig,
    private readonly connections: McpConnectionsService,
  ) {}

  static async create(
    database: DatabaseService,
    config: AppConfig,
    connections: McpConnectionsService,
  ) {
    await configureMcpClient(database, config)
    return new AuthService(createAuth(database, config, connections), config, connections)
  }

  getMcpAuthorizationMetadata(request: Request) {
    return oauthProviderAuthServerMetadata(this.auth)(request)
  }

  async getMcpPrincipal(token: string, resource: string) {
    const {
      MCP_CLIENT_ID: clientId,
      MCP_CLIENT_SECRET: clientSecret,
      BETTER_AUTH_URL: origin,
    } = this.config
    if (!clientId || !clientSecret) return null
    const claims = await this.auth.api.oauth2Introspect({
      body: {
        token,
        token_type_hint: 'access_token',
        client_id: clientId,
        client_secret: clientSecret,
      },
    })
    if (
      !claims.active ||
      typeof claims.sub !== 'string' ||
      claims.iss !== origin + '/api/auth' ||
      claims.client_id !== clientId ||
      (Array.isArray(claims.aud) ? !claims.aud.includes(resource) : claims.aud !== resource)
    )
      return null
    if (
      typeof claims.mcp_grant !== 'string' ||
      !(await this.connections.isActive(claims.sub, claims.mcp_grant))
    )
      return null
    return {
      userId: claims.sub,
      scopes: typeof claims.scope === 'string' ? claims.scope.split(' ') : [],
    }
  }

  getSession(headers: IncomingHttpHeaders) {
    return this.auth.api.getSession({
      headers: fromNodeHeaders(headers),
      query: { disableCookieCache: true },
    })
  }
}
