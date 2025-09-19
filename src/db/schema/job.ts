import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  pgEnum,
  uniqueIndex,
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

export const schemaDefinition = pgTable(
  'schema_definition',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: text('org_id'), // null = global, non-null = org-specific
    url: text('url'), // original URL reference
    hash: text('hash'), // dedupe key
    body: jsonb('body'),
    name: text('name').notNull(),
    description: text('description'),
    version: text('version').default('1.0.0'),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('schema_def_unique_hash_org').on(table.hash, table.orgId),
    uniqueIndex('schema_def_unique_url_org').on(table.url, table.orgId),
  ]
);

export const schemaLink = pgTable('schema_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  schemaId: uuid('schema_id')
    .notNull()
    .references(() => schemaDefinition.id, { onDelete: 'cascade' }),
  jobPostingId: uuid('job_posting_id').references(() => jobPosting.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});
