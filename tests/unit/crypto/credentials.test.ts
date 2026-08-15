// Set a test encryption key before importing the module
process.env['NODE_ENV'] = 'test';
process.env['CREDENTIAL_ENCRYPTION_KEY'] = 'a'.repeat(64);

import { encryptCredentials, decryptCredentials, encryptToString, decryptFromString } from '../../../src/crypto/credentials';

describe('credentials crypto', () => {
  const plaintext = {
    access_token: 'EAAG_super_secret_token',
    phone_number_id: 'pnid-123',
    waba_id: 'waba-456',
  };

  it('encrypts and decrypts correctly', () => {
    const encrypted = encryptCredentials(plaintext);
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.tag).toBeTruthy();
    expect(encrypted.data).toBeTruthy();
    expect(encrypted.data).not.toContain('EAAG');

    const decrypted = decryptCredentials(encrypted);
    expect(decrypted).toEqual(plaintext);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const e1 = encryptCredentials(plaintext);
    const e2 = encryptCredentials(plaintext);
    expect(e1.iv).not.toBe(e2.iv);
    expect(e1.data).not.toBe(e2.data);
  });

  it('round-trips via string serialisation', () => {
    const cipher = encryptToString(plaintext);
    const result = decryptFromString(cipher);
    expect(result).toEqual(plaintext);
  });

  it('fails if data is tampered', () => {
    const encrypted = encryptCredentials(plaintext);
    encrypted.data = encrypted.data.slice(0, -2) + 'ff';
    expect(() => decryptCredentials(encrypted)).toThrow();
  });

  it('never contains plaintext access token in encrypted form', () => {
    const cipher = encryptToString(plaintext);
    expect(cipher).not.toContain('EAAG_super_secret_token');
  });
});
