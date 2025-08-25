import {
  text,
  timestamp,
  jsonb,
  pgEnum,
  pgTable,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from '@db/schema/auth';

export const profileType = pgEnum('profile_type', ['personal', 'client']);

export const location = pgTable('location', {
  id: uuid('id').primaryKey().defaultRandom(),
  tag: text('tag').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  address: text('address').notNull(),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  pincode: text('pincode'),
  gps: jsonb('gps'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const contact = pgTable('contact', {
  id: uuid('id').primaryKey().defaultRandom(),
  tag: text('tag').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  email: text('email'),
  phoneNumber: text('phone_number').array().notNull(),
  website: text('website').array(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const profile = pgTable('profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: profileType('type').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const profileLocation = pgTable('profile_location', {
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profile.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => location.id, { onDelete: 'cascade' }),
});

export const profileContact = pgTable('profile_contact', {
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profile.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id')
    .notNull()
    .references(() => contact.id, { onDelete: 'cascade' }),
});
