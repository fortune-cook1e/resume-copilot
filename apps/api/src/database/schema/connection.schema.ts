import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { oauthClient } from './oauth.schema';

// Independent of browser sessions and rotating provider token records.
export const oauthConnection = pgTable('oauth_connection', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  clientId: text('client_id').notNull().references(() => oauthClient.clientId, { onDelete: 'cascade' }),
  scopes: text('scopes').array().notNull(),
  authorizedAt: timestamp('authorized_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, table => [
  index('oauth_connection_user_id_idx').on(table.userId),
  check('oauth_connection_absolute_lifetime', sql`${table.expiresAt} = ${table.authorizedAt} + interval '720 hours'`),
]);
