import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

// Resume domain tables
export const resume = pgTable('resume', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Untitled Resume'),
  description: text('description').notNull().default(''),
  data: jsonb('data').notNull(),
  visibility: text('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
