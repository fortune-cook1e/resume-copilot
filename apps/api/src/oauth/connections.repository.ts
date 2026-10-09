import { and, eq, sql } from 'drizzle-orm'
import type { DatabaseService } from '../database/database.module'
import { oauthConnection, oauthConsent, oauthRefreshToken, user } from '../database/schema'

export class ConnectionsRepository {
  constructor(private readonly db: DatabaseService['db']) {}

  async revokeOwned(userId: string, id: string) {
    const revoked = await this.db
      .update(oauthConnection)
      .set({
        revokedAt: sql`coalesce(${oauthConnection.revokedAt}, ${new Date().toISOString()})`,
      })
      .where(and(eq(oauthConnection.id, id), eq(oauthConnection.userId, userId)))
      .returning({ id: oauthConnection.id })
    return revoked.length === 1
  }

  async findUser(id: string) {
    const [account] = await this.db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, id))
      .limit(1)
    return account
  }

  async find(id: string) {
    const [connection] = await this.db
      .select()
      .from(oauthConnection)
      .where(eq(oauthConnection.id, id))
      .limit(1)
    return connection
  }

  async findConsent(id: string, userId: string, clientId: string) {
    const [consent] = await this.db
      .select()
      .from(oauthConsent)
      .where(
        and(
          eq(oauthConsent.referenceId, id),
          eq(oauthConsent.userId, userId),
          eq(oauthConsent.clientId, clientId),
        ),
      )
      .limit(1)
    return consent
  }

  async findRefreshAuthorization(tokenHash: string) {
    const [authorization] = await this.db
      .select({
        referenceId: oauthRefreshToken.referenceId,
        userId: oauthRefreshToken.userId,
        clientId: oauthRefreshToken.clientId,
        scopes: oauthRefreshToken.scopes,
        revoked: oauthRefreshToken.revoked,
        replayExpiresAt: oauthRefreshToken.rotationReplayExpiresAt,
      })
      .from(oauthRefreshToken)
      .where(eq(oauthRefreshToken.token, tokenHash))
      .limit(1)
    return authorization
  }

  async create(connection: typeof oauthConnection.$inferInsert) {
    // A repeated code exchange must never replace the original deadline/state.
    await this.db.insert(oauthConnection).values(connection).onConflictDoNothing()
  }
}
