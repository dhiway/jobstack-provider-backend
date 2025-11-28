import { createHash } from 'crypto';
import type { ColumnAnonymizationRule } from './config.js';

/**
 * Get the salt for anonymization from environment variable
 */
function getSalt(): string {
  const salt = process.env.SANDBOX_SALT;
  if (!salt) {
    throw new Error(
      'SANDBOX_SALT environment variable is required for anonymization'
    );
  }
  return salt;
}

/**
 * Hash a value consistently (same input = same hash)
 * Uses SHA-256 for better security than MD5
 */
export function hashValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const salt = getSalt();
  const input = String(value);
  return createHash('sha256')
    .update(input + salt)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for shorter hashes
}

/**
 * Anonymize an email while preserving format
 */
export function anonymizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  
  const hash = hashValue(email);
  const [localPart] = email.split('@');
  const domain = email.includes('@') ? email.split('@')[1] : 'example.com';
  
  // Preserve format: hash_local@hash_domain.com
  return `${hash.substring(0, 8)}@${hash.substring(8, 12)}.${domain.split('.')[domain.split('.').length - 1] || 'com'}`;
}

/**
 * Anonymize a phone number while preserving format
 */
export function anonymizePhone(
  phone: string | null | undefined
): string | null {
  if (!phone) return null;
  
  const hash = hashValue(phone);
  // Preserve format: +XX-XXXX-XXXX
  const digits = hash.substring(0, 10).match(/.{1,4}/g) || [];
  return `+${digits[0] || '00'}-${digits[1] || '0000'}-${digits[2] || '0000'}`;
}

/**
 * Anonymize a name
 */
export function anonymizeName(name: string | null | undefined): string {
  if (!name) return 'Anonymous';
  
  const hash = hashValue(name);
  return `User_${hash.substring(0, 8)}`;
}

/**
 * Anonymize an address
 */
export function anonymizeAddress(
  address: string | null | undefined
): string {
  if (!address) return '[ANONYMIZED]';
  
  const hash = hashValue(address);
  return `Address_${hash.substring(0, 8)}`;
}

/**
 * Anonymize a pincode
 */
export function anonymizePincode(
  pincode: string | null | undefined
): string | null {
  if (!pincode) return null;
  
  const hash = hashValue(pincode);
  // Return a 6-digit anonymized pincode
  return hash.substring(0, 6).padEnd(6, '0');
}

/**
 * Anonymize a user ID while maintaining referential integrity
 * Same user ID will always hash to the same value
 */
export function anonymizeUserId(userId: string | null | undefined): string {
  if (!userId) return '';
  
  const hash = hashValue(userId);
  // Keep similar format but use hash
  return `usr_${hash.substring(0, 16)}`;
}

/**
 * Apply anonymization rule to a column value
 */
export function applyAnonymizationRule(
  value: unknown,
  rule: ColumnAnonymizationRule
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item === null || item === undefined) return item;
      const stringItem = String(item);
      if (rule.column.includes('phone')) {
        return anonymizePhone(stringItem);
      }
      return hashValue(stringItem);
    });
  }

  const stringValue = String(value);

  switch (rule.method) {
    case 'hash':
      if (rule.preserveFormat) {
        // Check if it looks like an email
        if (stringValue.includes('@')) {
          return anonymizeEmail(stringValue);
        }
        // Check if it looks like a phone number
        if (/[\d+\-()]/.test(stringValue)) {
          return anonymizePhone(stringValue);
        }
      }
      
      // Check column name for specific handling
      if (rule.column === 'email') {
        return anonymizeEmail(stringValue);
      }
      if (rule.column === 'phone_number' || rule.column.includes('phone')) {
        return anonymizePhone(stringValue);
      }
      if (rule.column === 'name' || rule.column.includes('name')) {
        return anonymizeName(stringValue);
      }
      if (rule.column === 'id' && rule.column.includes('user')) {
        return anonymizeUserId(stringValue);
      }
      if (rule.column === 'address') {
        return anonymizeAddress(stringValue);
      }
      if (rule.column === 'pincode') {
        return anonymizePincode(stringValue);
      }
      
      // Default hash
      return hashValue(stringValue);

    case 'remove':
      return null;

    case 'randomize':
      // For now, treat as hash
      return hashValue(stringValue);

    case 'keep':
    default:
      return value;
  }
}

/**
 * Anonymize a row based on configuration rules
 */
export function anonymizeRow(
  row: Record<string, unknown>,
  anonymizeColumns?: ColumnAnonymizationRule[]
): Record<string, unknown> {
  if (!anonymizeColumns || anonymizeColumns.length === 0) {
    return row;
  }

  const anonymized = { ...row };

  for (const rule of anonymizeColumns) {
    if (anonymized[rule.column] !== undefined) {
      anonymized[rule.column] = applyAnonymizationRule(
        anonymized[rule.column],
        rule
      );
    }
  }

  return anonymized;
}

/**
 * Create a mapping of original user IDs to anonymized user IDs
 * This ensures referential integrity across tables
 */
export class UserIdMapper {
  private mapping = new Map<string, string>();

  /**
   * Get anonymized user ID for an original user ID
   */
  getAnonymizedUserId(originalId: string): string {
    if (!this.mapping.has(originalId)) {
      this.mapping.set(originalId, anonymizeUserId(originalId));
    }
    return this.mapping.get(originalId)!;
  }

  /**
   * Get all mappings (for debugging)
   */
  getMappings(): Map<string, string> {
    return new Map(this.mapping);
  }

  /**
   * Clear mappings
   */
  clear(): void {
    this.mapping.clear();
  }
}

