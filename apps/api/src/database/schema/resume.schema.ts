import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core'
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
  (table) => [index('resume_user_updated_idx').on(table.userId, table.updatedAt)],
)
