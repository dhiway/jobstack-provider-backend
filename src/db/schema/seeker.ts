import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { user } from '@db/schema/auth';

export const seekerMetadata = pgTable('seeker_metadata', {
  userId: text('user_id')
    .notNull()
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  skills: jsonb('skills').array().notNull(),
  languages: jsonb('languages').array().notNull(),
});
