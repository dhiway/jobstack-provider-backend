/**
 * Sanitization configuration for sandbox database
 * Defines which tables/columns to include/exclude and anonymization rules
 */

import { anonymizePhone } from './anonymize.js';

export type AnonymizationMethod = 'hash' | 'remove' | 'randomize' | 'keep';

export interface ColumnAnonymizationRule {
  column: string;
  method: AnonymizationMethod;
  preserveFormat?: boolean; // For emails/phones, preserve format structure
}

export interface TableConfig {
  include: boolean;
  anonymizeColumns?: ColumnAnonymizationRule[];
  excludeColumns?: string[];
  customTransform?: (row: Record<string, unknown>) => Record<string, unknown>;
}

export const SANITIZATION_CONFIG: Record<string, TableConfig> = {
  // Include with anonymization
  user: {
    include: true,
    anonymizeColumns: [
      { column: 'email', method: 'hash', preserveFormat: true },
      { column: 'phone_number', method: 'hash', preserveFormat: true },
      { column: 'name', method: 'hash' },
      { column: 'id', method: 'hash' }, // Hash user ID but keep referential integrity
      { column: 'image', method: 'remove' },
    ],
  },

  organization: {
    include: true,
    // Keep as-is (non-PII)
  },

  job_posting: {
    include: true,
    // Keep as-is (non-PII)
  },

  job_application: {
    include: true,
    anonymizeColumns: [
      { column: 'user_name', method: 'hash' },
      { column: 'user_id', method: 'hash' },
    ],
    customTransform: (row) => {
      // Sanitize JSONB fields - only anonymize contact PII, keep location data as-is
      const sanitized = { ...row };
      
      if (sanitized.contact && typeof sanitized.contact === 'object') {
        const contact = sanitized.contact as Record<string, unknown>;
        if (contact.email) contact.email = '[ANONYMIZED]';
        if (contact.phone_number) contact.phone_number = '[ANONYMIZED]';
        sanitized.contact = contact;
      }
      
      // Keep location data as-is (no anonymization)
      
      return sanitized;
    },
  },

  location: {
    include: true,
    anonymizeColumns: [
      { column: 'user_id', method: 'hash' }, // Only anonymize user_id, keep location data as-is
    ],
    // Keep all location data (address, pincode, GPS) as-is - no anonymization
  },

  contact: {
    include: true,
    anonymizeColumns: [
      { column: 'email', method: 'hash', preserveFormat: true },
      { column: 'phone_number', method: 'hash', preserveFormat: true },
      { column: 'user_id', method: 'hash' },
    ],
    customTransform: (row) => {
      const sanitized = { ...row };
      // Handle phone_number array
      if (Array.isArray(sanitized.phone_number)) {
        sanitized.phone_number = sanitized.phone_number.map((phone: unknown) => {
          if (!phone) return phone;
          return anonymizePhone(String(phone));
        });
      }
      return sanitized;
    },
  },

  profile: {
    include: true,
    anonymizeColumns: [
      { column: 'user_id', method: 'hash' },
    ],
    customTransform: (row) => {
      // Keep metadata structure but sanitize only user-related PII (email, phone, name)
      // Keep location-related data (address) as-is
      const sanitized = { ...row };
      if (sanitized.metadata && typeof sanitized.metadata === 'object') {
        const metadata = sanitized.metadata as Record<string, unknown>;
        // Remove only user-related PII fields from metadata, keep location data
        const piiFields = ['email', 'phone', 'phoneNumber', 'name'];
        piiFields.forEach((field) => {
          if (metadata[field]) {
            delete metadata[field];
          }
        });
        sanitized.metadata = metadata;
      }
      return sanitized;
    },
  },

  profile_location: {
    include: true,
    // Keep as-is (junction table)
  },

  profile_contact: {
    include: true,
    // Keep as-is (junction table)
  },

  member: {
    include: true,
    anonymizeColumns: [
      { column: 'user_id', method: 'hash' },
    ],
  },

  team: {
    include: true,
    // Keep as-is (non-PII)
  },

  team_member: {
    include: true,
    anonymizeColumns: [
      { column: 'user_id', method: 'hash' },
    ],
  },

  schema_definition: {
    include: true,
    // Keep as-is (non-PII)
  },

  schema_link: {
    include: true,
    // Keep as-is (non-PII)
  },

  // Exclude sensitive tables
  account: {
    include: false,
  },

  verification: {
    include: false,
  },

  apikey: {
    include: false,
  },

  invitation: {
    include: false,
  },
};

/**
 * Tables that should be synced in order (respecting foreign key dependencies)
 */
export const SYNC_ORDER = [
  'organization',
  'user',
  'team',
  'member',
  'team_member',
  'location',
  'contact',
  'profile',
  'profile_location',
  'profile_contact',
  'job_posting',
  'schema_definition',
  'schema_link',
  'job_application',
];

/**
 * Get configuration for a table
 */
export function getTableConfig(tableName: string): TableConfig | undefined {
  return SANITIZATION_CONFIG[tableName];
}

/**
 * Check if a table should be included
 */
export function shouldIncludeTable(tableName: string): boolean {
  const config = getTableConfig(tableName);
  return config?.include === true;
}

/**
 * Get tables to include
 */
export function getIncludedTables(): string[] {
  return Object.entries(SANITIZATION_CONFIG)
    .filter(([_, config]) => config.include === true)
    .map(([tableName]) => tableName);
}

