import crypto from 'crypto';

const KEY_PREFIX_LENGTH = 8;
const KEY_BYTES = 32;

export interface GeneratedApiKey {
  raw: string;
  hash: string;
  prefix: string;
}

export function generateApiKey(): GeneratedApiKey {
  const raw = crypto.randomBytes(KEY_BYTES).toString('hex');
  const prefix = raw.slice(0, KEY_PREFIX_LENGTH);
  const hash = hashApiKey(raw);
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function verifyApiKey(raw: string, storedHash: string): boolean {
  const hash = hashApiKey(raw);
  // Constant-time comparison
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

export function generateAdminToken(length = 48): string {
  return crypto.randomBytes(length).toString('hex');
}
