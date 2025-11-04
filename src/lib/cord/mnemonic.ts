import crypto from 'crypto';

const ENC_KEY = process.env.MNEMONIC_SECRET_KEY!;
const IV_LENGTH = 16;

// Validate and prepare encryption key
// Accept either 64 hex characters (32 bytes) or 32 raw bytes
let encryptionKey: Buffer;
if (!ENC_KEY) {
  throw new Error('MNEMONIC_SECRET_KEY is required');
}

if (ENC_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(ENC_KEY)) {
  // Hex-encoded key (64 hex chars = 32 bytes)
  encryptionKey = Buffer.from(ENC_KEY, 'hex');
} else if (ENC_KEY.length === 32) {
  // Raw bytes (32 characters = 32 bytes)
  encryptionKey = Buffer.from(ENC_KEY);
} else {
  throw new Error('MNEMONIC_SECRET_KEY must be either 32 bytes (raw) or 64 hex characters (hex-encoded)');
}

export function encryptMnemonic(mnemonic: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decryptMnemonic(encMnemonic: string): string {
  const [ivHex, tagHex, encrypted] = encMnemonic.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    iv
  );
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

