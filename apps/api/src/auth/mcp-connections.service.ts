import { Inject, Injectable } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { and, eq, isNotNull } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { mcpConnectionSchema } from '@resume-copilot/contracts'
import { appConfig } from '../config/app.config'
import { DatabaseService } from '../database/database.module'
import { oauthAccessToken, oauthConsent, oauthRefreshToken } from '../database/schema'

export const hashMcpToken = (token: string) =>
  createHash('sha256').update(token).digest('base64url')

@Injectable()
export class McpConnectionsService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async get(userId: string) {
    const rows = await this.consents(userId)
    if (!rows.length) return null
    const scopes = [...new Set(rows.flatMap(({ scopes }) => JSON.parse(scopes) as string[]))]
    return mcpConnectionSchema.parse({ clientName: 'ChatGPT', scopes })
  }

  async getReference(userId: string) {
    const [consent] = await this.consents(userId)
    return consent?.referenceId
  }

  async isActive(userId: string, referenceId: string) {
    const clientId = this.config.MCP_CLIENT_ID
    if (!clientId) return false
    const [grant] = await this.database.db
      .select({ id: oauthConsent.id })
      .from(oauthConsent)
      .where(
        and(
          eq(oauthConsent.userId, userId),
          eq(oauthConsent.clientId, clientId),
          eq(oauthConsent.referenceId, referenceId),
        ),
      )
      .limit(1)
    return Boolean(grant)
  }

  async hasRefreshGrant(token: string) {
    const clientId = this.config.MCP_CLIENT_ID
    if (!clientId) return false
    const [grant] = await this.database.db
      .select({ id: oauthConsent.id })
      .from(oauthRefreshToken)
      .innerJoin(
        oauthConsent,
        and(
          eq(oauthRefreshToken.userId, oauthConsent.userId),
          eq(oauthRefreshToken.clientId, oauthConsent.clientId),
          eq(oauthRefreshToken.referenceId, oauthConsent.referenceId),
        ),
      )
      .where(
        and(
          eq(oauthRefreshToken.clientId, clientId),
          eq(oauthRefreshToken.token, hashMcpToken(token)),
        ),
      )
      .limit(1)
    return Boolean(grant)
  }

  async disconnect(userId: string) {
    const clientId = this.config.MCP_CLIENT_ID
    if (!clientId) return null
    await this.database.db.batch([
      this.database.db
        .delete(oauthAccessToken)
        .where(and(eq(oauthAccessToken.clientId, clientId), eq(oauthAccessToken.userId, userId))),
      this.database.db
        .delete(oauthRefreshToken)
        .where(and(eq(oauthRefreshToken.clientId, clientId), eq(oauthRefreshToken.userId, userId))),
      this.database.db
        .delete(oauthConsent)
        .where(and(eq(oauthConsent.clientId, clientId), eq(oauthConsent.userId, userId))),
    ])
    return null
  }

  private async consents(userId: string) {
    const clientId = this.config.MCP_CLIENT_ID
    if (!clientId) return []
    return this.database.db
      .select({ referenceId: oauthConsent.referenceId, scopes: oauthConsent.scopes })
      .from(oauthConsent)
      .where(
        and(
          eq(oauthConsent.clientId, clientId),
          eq(oauthConsent.userId, userId),
          isNotNull(oauthConsent.referenceId),
        ),
      )
      .orderBy(oauthConsent.id)
  }
}
