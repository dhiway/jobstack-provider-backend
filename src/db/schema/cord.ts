import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { organization, user } from './auth';
import { jobPosting } from './job';

// For organizations - stores CORD account, profile, and registry
export const organizationCordAccount = pgTable('organization_cord_account', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  cordAddress: text('cord_address').notNull(),
  cordPublicKey: text('cord_public_key').notNull(),
  cordMnemonicEnc: text('cord_mnemonic_enc').notNull(),
  cordProfileId: text('cord_profile_id'), // Profile ID (DID)
  cordRegistryId: text('cord_registry_id'), // Registry ID for revocation
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// For users - stores CORD account and DID
export const userCordAccount = pgTable('user_cord_account', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  cordAddress: text('cord_address').notNull(),
  cordPublicKey: text('cord_public_key').notNull(),
  cordMnemonicEnc: text('cord_mnemonic_enc').notNull(),
  cordDid: text('cord_did'), // DID identifier
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// For job postings - stores CORD registry entry mapping
export const jobPostingCordEntry = pgTable('job_posting_cord_entry', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobPostingId: uuid('job_posting_id')
    .notNull()
    .references(() => jobPosting.id, { onDelete: 'cascade' }),
  cordEntryId: text('cord_entry_id').notNull(), // Registry Entry ID on CORD chain
  registryId: text('registry_id').notNull(), // Registry ID (for reference)
  txHash: text('tx_hash'), // Transaction hash of the entry
  revoked: boolean('revoked').notNull().default(false), // Entry revocation status
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

