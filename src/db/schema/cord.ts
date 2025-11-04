import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organization, user } from './auth';

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

