import { ConnectionsRepository } from './connections.repository';

export class InactiveConnectionError extends Error {
  constructor() { super('Connection is not active'); }
}

export class ConnectionsService {
  constructor(private readonly repository: ConnectionsRepository) {}

  // The calling browser boundary must supply its verified platform user ID.
  // One owner-scoped UPDATE is the commit point; retries preserve the timestamp.
  async revoke(userId: string, connectionId: string) {
    return this.repository.revokeOwned(userId, connectionId);
  }

  async status(claims: Record<string, unknown>) {
    await this.authorizeAccess(claims);
    const connection = await this.repository.find(claims.mcp_connection_id as string);
    const account = await this.repository.findUser(claims.sub as string);
    if (!connection || !account) throw new InactiveConnectionError();
    return { connectionId: connection.id, accountId: account.id, displayName: account.name, grantedScopes: connection.scopes };
  }

  async authorizeRefresh(tokenHash: string) {
    const authorization = await this.repository.findRefreshAuthorization(tokenHash);
    if (!authorization?.referenceId) throw new InactiveConnectionError();
    await this.authorizeIssuance({ ...authorization, referenceId: authorization.referenceId });
    if (authorization.revoked && (!authorization.replayExpiresAt || authorization.replayExpiresAt.getTime() <= Date.now())) {
      // Intercept before the provider's user/client-wide family invalidation.
      // Compromised rotation credentials invalidate only their own connection.
      await this.repository.revokeOwned(authorization.userId, authorization.referenceId);
      throw new InactiveConnectionError();
    }
  }

  // Call only after the protocol adapter verifies signature, issuer, audience and scope.
  async authorizeAccess(claims: Record<string, unknown>) {
    if (typeof claims.mcp_connection_id !== 'string' || typeof claims.sub !== 'string'
      || typeof claims.client_id !== 'string' || typeof claims.scope !== 'string') throw new InactiveConnectionError();
    await this.authorizeIssuance({
      referenceId: claims.mcp_connection_id, userId: claims.sub, clientId: claims.client_id,
      scopes: claims.scope.split(' ').filter(Boolean),
    });
  }

  async authorizeIssuance(input: {
    referenceId?: string;
    userId?: string;
    clientId: string;
    scopes: string[];
    grantType?: string;
  }) {
    const { referenceId, userId, clientId, scopes, grantType } = input;
    if (!referenceId || !userId) throw new InactiveConnectionError();
    let connection = await this.repository.find(referenceId);
    if (!connection && grantType === 'authorization_code') {
      // The provider creates this consent only after authenticated approval.
      // Its timestamp, not exchange/refresh time, starts the absolute lifetime.
      const consent = await this.repository.findConsent(referenceId, userId, clientId);
      if (!consent) throw new InactiveConnectionError();
      await this.repository.create({
        id: referenceId, userId, clientId, scopes: consent.scopes,
        authorizedAt: consent.createdAt,
        expiresAt: new Date(consent.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
      connection = await this.repository.find(referenceId);
    }
    if (!connection || connection.userId !== userId || connection.clientId !== clientId
      || connection.revokedAt || connection.expiresAt.getTime() <= Date.now()
      || !scopes.every(scope => connection.scopes.includes(scope))) throw new InactiveConnectionError();
    return { mcp_connection_id: connection.id };
  }
}
