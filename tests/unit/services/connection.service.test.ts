import * as connectionRepo from '../../../src/repositories/connection.repository';
import * as credentials from '../../../src/crypto/credentials';
import { createConnection, getConnection, validateConnection, updateConnection } from '../../../src/services/connection.service';
import { getProvider } from '../../../src/providers/registry';
import {
  Channel,
  Provider,
  AuthMethod,
  ConnectionStatus,
} from '../../../src/types';

jest.mock('../../../src/repositories/connection.repository');
jest.mock('../../../src/crypto/credentials');
jest.mock('../../../src/providers/registry');

const mockConnRepo = connectionRepo as jest.Mocked<typeof connectionRepo>;
const mockCrypto = credentials as jest.Mocked<typeof credentials>;
const mockGetProvider = getProvider as jest.Mock;

const fakeConnection = {
  id: 'conn-1',
  product_id: 'prod-1',
  tenant_id: 'tenant-1',
  channel: Channel.WhatsApp,
  provider: Provider.Meta,
  auth_method: AuthMethod.Manual,
  status: ConnectionStatus.Pending,
  config: {},
  created_at: new Date(),
  updated_at: new Date(),
};

describe('connection.service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createConnection', () => {
    it('creates a connection and encrypts credentials', async () => {
      mockConnRepo.existsByIdentity.mockResolvedValue(false);
      mockCrypto.encryptCredentials.mockReturnValue({ iv: 'iv', tag: 'tag', data: 'encrypted' });
      mockConnRepo.createConnection.mockResolvedValue(fakeConnection);

      const result = await createConnection({
        productId: 'prod-1',
        tenantId: 'tenant-1',
        channel: Channel.WhatsApp,
        provider: Provider.Meta,
        credentials: { access_token: 'secret', phone_number_id: 'pnid', waba_id: 'waba' },
      });

      expect(mockCrypto.encryptCredentials).toHaveBeenCalled();
      // Plaintext credentials must NOT be in the result
      expect(JSON.stringify(result)).not.toContain('secret');
      expect(result.id).toBe('conn-1');
    });

    it('throws ConflictError when connection already exists', async () => {
      mockConnRepo.existsByIdentity.mockResolvedValue(true);
      await expect(createConnection({
        productId: 'prod-1',
        tenantId: 'tenant-1',
        channel: Channel.WhatsApp,
        provider: Provider.Meta,
        credentials: {},
      })).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('getConnection', () => {
    it('returns connection when product matches', async () => {
      mockConnRepo.findById.mockResolvedValue(fakeConnection);
      const result = await getConnection('conn-1', 'prod-1');
      expect(result).toEqual(fakeConnection);
    });

    it('throws when connection belongs to different product (isolation)', async () => {
      mockConnRepo.findById.mockResolvedValue({ ...fakeConnection, product_id: 'other-prod' });
      await expect(getConnection('conn-1', 'prod-1'))
        .rejects.toMatchObject({ code: 'CONNECTION_NOT_FOUND' });
    });

    it('throws when connection does not exist', async () => {
      mockConnRepo.findById.mockResolvedValue(null);
      await expect(getConnection('missing', 'prod-1'))
        .rejects.toMatchObject({ code: 'CONNECTION_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('validateConnection', () => {
    it('returns valid and updates status to active', async () => {
      mockConnRepo.findById.mockResolvedValue(fakeConnection);
      mockConnRepo.getCredentials.mockResolvedValue({ iv: 'iv', tag: 'tag', data: 'enc' });
      mockCrypto.decryptCredentials.mockReturnValue({ access_token: 'token', phone_number_id: 'pnid' });
      mockConnRepo.updateConnection.mockResolvedValue(undefined);

      const mockProvider = {
        validateConnection: jest.fn().mockResolvedValue({
          valid: true,
          phoneNumber: '+91 98765 43210',
          displayName: 'Test Business',
        }),
      };
      mockGetProvider.mockReturnValue(mockProvider);

      const result = await validateConnection('conn-1', 'prod-1');
      expect(result.valid).toBe(true);
      expect(mockConnRepo.updateConnection).toHaveBeenCalledWith('conn-1', { status: ConnectionStatus.Active });
    });

    it('marks connection invalid when validation fails', async () => {
      mockConnRepo.findById.mockResolvedValue(fakeConnection);
      mockConnRepo.getCredentials.mockResolvedValue({ iv: 'iv', tag: 'tag', data: 'enc' });
      mockCrypto.decryptCredentials.mockReturnValue({ access_token: 'bad', phone_number_id: 'pnid' });
      mockConnRepo.updateConnection.mockResolvedValue(undefined);

      const mockProvider = {
        validateConnection: jest.fn().mockResolvedValue({
          valid: false,
          error: 'Token expired',
        }),
      };
      mockGetProvider.mockReturnValue(mockProvider);

      const result = await validateConnection('conn-1', 'prod-1');
      expect(result.valid).toBe(false);
      expect(mockConnRepo.updateConnection).toHaveBeenCalledWith('conn-1', { status: ConnectionStatus.Invalid });
    });
  });

  describe('updateConnection', () => {
    it('merges new partial credentials with existing decrypted credentials', async () => {
      mockConnRepo.findById.mockResolvedValue(fakeConnection);
      mockConnRepo.getCredentials.mockResolvedValue({ iv: 'iv', tag: 'tag', data: 'enc' });
      mockCrypto.decryptCredentials.mockReturnValue({
        access_token: 'existing_token_secret',
        phone_number_id: 'old_pnid',
        waba_id: 'old_waba',
      });
      mockCrypto.encryptCredentials.mockReturnValue({ iv: 'iv2', tag: 'tag2', data: 'enc2' });
      mockConnRepo.updateCredentials.mockResolvedValue(undefined);
      mockConnRepo.updateConnection.mockResolvedValue(undefined);

      // User updates only waba_id and phone_number_id, omitting access_token
      await updateConnection('conn-1', 'prod-1', {
        credentials: {
          waba_id: 'new_waba_123',
          phone_number_id: 'new_pnid_456',
        },
        config: {
          waba_id: 'new_waba_123',
          phone_number_id: 'new_pnid_456',
        },
      });

      // Assert that encryptCredentials was called with the merged credentials including the existing access_token
      expect(mockCrypto.encryptCredentials).toHaveBeenCalledWith({
        access_token: 'existing_token_secret',
        phone_number_id: 'new_pnid_456',
        waba_id: 'new_waba_123',
      });
      expect(mockConnRepo.updateCredentials).toHaveBeenCalledWith('conn-1', {
        iv: 'iv2',
        tag: 'tag2',
        data: 'enc2',
      });
    });
  });
});
