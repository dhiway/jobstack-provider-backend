import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { organization, user } from '@db/schema/auth';

export const jobStatusEnum = pgEnum('job_status', [
  'draft',
  'open',
  'closed',
  'archived',
]);

export const jobPosting = pgTable('job_posting', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: jobStatusEnum('status').notNull().default('draft'),
  location: jsonb('location'),
  contact: jsonb('contact'),
  metadata: jsonb('metadata').notNull(),
  organizationName: text('organization_name').notNull(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const jobApplication = pgTable('job_application', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobPosting.id, { onDelete: 'cascade' }),
  transactionId: text('transaction_id'),
  status: jobStatusEnum('status').notNull().default('draft'),
  applicationStatus: text('application_status').default(''),
  userName: text('user_name').notNull(),
  userId: text('user_id').notNull(),
  /* .references(() => user.id, { onDelete: 'cascade' }), */
  location: jsonb('location').notNull(),
  contact: jsonb('contact').notNull(),
  metadata: jsonb('metadata').notNull(),
  appliedAt: timestamp('applied_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});
