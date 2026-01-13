import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Session history table to preserve session logs for audit purposes
 * This tracks all login/logout events even after sessions are terminated
 */
export const sessionHistory = pgTable('session_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  loginAt: timestamp('login_at').notNull(),
  logoutAt: timestamp('logout_at'),
  lastActivityAt: timestamp('last_activity_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionToken: text('session_token'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});
