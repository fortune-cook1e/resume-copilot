import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, index, primaryKey } from 'drizzle-orm/sqlite-core'
import { user } from './auth.schema'
const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' })
const now = sql`(unixepoch('subsec') * 1000)`

export const resume = sqliteTable(
  'resume',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Untitled Resume'),
    description: text('description').notNull().default(''),
    data: text('data', { mode: 'json' }).notNull(),
    visibility: text('visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('private'),
    createdAt: timestamp('created_at').notNull().default(now),
    updatedAt: timestamp('updated_at').notNull().default(now),
  },
  (table) => [
    index('resume_user_updated_idx').on(table.userId, table.updatedAt),
    index('resume_user_id_idx').on(table.userId, table.id),
  ],
)

export const resumeCreateRequest = sqliteTable(
  'resume_create_request',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    requestKey: text('request_key').notNull(),
    requestHash: text('request_hash').notNull(),
    // Keep the receipt after a resume is deleted so a delayed retry cannot recreate it.
    resumeId: text('resume_id').notNull(),
    version: integer('version').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.requestKey] })],
)
