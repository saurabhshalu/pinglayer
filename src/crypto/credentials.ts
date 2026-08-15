import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCODING = 'hex';

function getKey(): Buffer {
  const keyHex = config.crypto.credentialEncryptionKey;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a 64-character hex string');
  }
  return Buffer.from(keyHex, ENCODING);
}

export interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

export function encryptCredentials(plaintext: Record<string, string>): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;

  const json = JSON.stringify(plaintext);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString(ENCODING),
    tag: tag.toString(ENCODING),
    data: encrypted.toString(ENCODING),
  };
}

export function decryptCredentials(payload: EncryptedPayload): Record<string, string> {
  const key = getKey();
  const iv = Buffer.from(payload.iv, ENCODING);
  const tag = Buffer.from(payload.tag, ENCODING);
  const data = Buffer.from(payload.data, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as Record<string, string>;
}

export function encryptToString(plaintext: Record<string, string>): string {
  const payload = encryptCredentials(plaintext);
  return JSON.stringify(payload);
}

export function decryptFromString(ciphertext: string): Record<string, string> {
  const payload = JSON.parse(ciphertext) as EncryptedPayload;
  return decryptCredentials(payload);
}
