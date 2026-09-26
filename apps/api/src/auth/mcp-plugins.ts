import { createHash, randomUUID } from 'node:crypto';
import { defineRequestState } from '@better-auth/core/context';
import { cimd } from '@better-auth/cimd';
import { fetchClientMetadataResource } from '@better-auth/cimd/node';
import { mcp } from '@better-auth/mcp';
import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { ConnectionsService, InactiveConnectionError } from '../oauth/connections.service';
import { jwt } from 'better-auth/plugins';

// Own the documented storage hash configuration so preflight never depends on
// a provider-internal hashing algorithm. Refresh tokens have no custom prefix/format.
const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');

function connectionRefreshCheck(connections: ConnectionsService): BetterAuthPlugin {
  return {
    id: 'mcp-connection-lifetime',
    hooks: { before: [{
      matcher: ctx => ctx.path === '/oauth2/token' && ctx.body?.grant_type === 'refresh_token',
      handler: createAuthMiddleware(async ctx => {
        try {
          if (typeof ctx.body?.refresh_token !== 'string') throw new InactiveConnectionError();
          // Also runs before the provider's cached rotation retry response.
          await connections.authorizeRefresh(hashToken(ctx.body.refresh_token));
        } catch (error) {
          if (!(error instanceof InactiveConnectionError)) throw error;
          throw new APIError('BAD_REQUEST', { error: 'invalid_grant', error_description: 'Connection is not active' });
        }
      }),
    }] },
  };
}

// Local trial: desktop clients discover their registration automatically from
// ChatGPT's published metadata. No open dynamic registration or manual token.
export function createMcpPlugins(
  publicOrigin: string, connections: ConnectionsService,
  metadataFetch: typeof fetchClientMetadataResource = fetchClientMetadataResource,
): [ReturnType<typeof jwt>, ReturnType<typeof mcp>, ReturnType<typeof cimd>, BetterAuthPlugin] {
  const consentReference = defineRequestState(() => randomUUID());
  return [
    jwt({ disableSettingJwtHeader: true }),
    mcp({
      loginPage: '/login',
      consentPage: '/oauth/consent',
      resource: new URL('/api/mcp', publicOrigin).href,
      scopes: ['connection:read', 'offline_access'],
      grantTypes: ['authorization_code', 'refresh_token'],
      accessTokenExpiresIn: 15 * 60,
      refreshTokenExpiresIn: 30 * 24 * 60 * 60,
      storeTokens: { hash: hashToken },
      prefix: { refreshToken: '' },
      allowDynamicClientRegistration: false,
      // A fresh server-generated reference prevents reuse of prior consent.
      // The provider carries it from explicit approval through every rotation.
      postLogin: {
        page: '/oauth/consent',
        shouldRedirect: async () => false,
        consentReferenceId: () => consentReference.get(),
      },
      extensions: [{ claims: { accessToken: async ({ referenceId, user, client, scopes, grantType }) => {
        try {
          return await connections.authorizeIssuance({ referenceId, userId: user?.id, clientId: client.clientId, scopes, grantType });
        } catch (error) {
          if (!(error instanceof InactiveConnectionError)) throw error;
          throw new APIError('BAD_REQUEST', { error: 'invalid_grant', error_description: 'Connection is not active' });
        }
      } } }],
      // No open RFC 7591 registration: only allowlisted ChatGPT CIMD documents
      // can supply client identity, and every authorization still needs consent.
      clientPrivileges: async () => false,
      resourcePrivileges: async () => false,
    }),
    cimd({
      fetchClientMetadataResource: metadataFetch,
      metadataProfile: 'mcp-2026-07-28',
      // A metadata client ID is a remote URL. Fetch only the expected official
      // client's documents; the supplied Node transport also pins public DNS,
      // validates TLS, and refuses redirects at connection time.
      isMetadataDocumentUrlAllowed: value => {
        let url: URL;
        try { url = new URL(value); } catch { return false; }
        return url.protocol === 'https:' && url.hostname === 'chatgpt.com' && !url.port
          && !url.username && !url.password && !url.search && !url.hash
          && /^\/oauth\/codex\/(?:client\.json|[A-Za-z0-9_-]+\/client\.json)$/.test(url.pathname);
      },
    }),
    connectionRefreshCheck(connections),
  ];
}
