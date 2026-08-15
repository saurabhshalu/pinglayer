import * as productRepo from '../../../src/repositories/product.repository';
import * as productService from '../../../src/services/product.service';
import { generateApiKey, hashApiKey } from '../../../src/crypto/apiKeys';
import { ProductStatus, ApiKeyStatus } from '../../../src/types';

jest.mock('../../../src/repositories/product.repository');
jest.mock('../../../src/crypto/apiKeys');

const mockRepo = productRepo as jest.Mocked<typeof productRepo>;
const mockCrypto = { generateApiKey: generateApiKey as jest.Mock, hashApiKey: hashApiKey as jest.Mock };

const fakeProduct = {
  id: 'prod-1',
  name: 'Test SaaS',
  slug: 'test-saas',
  status: ProductStatus.Active,
  created_at: new Date(),
  updated_at: new Date(),
};

const fakeApiKey = {
  id: 'key-1',
  product_id: 'prod-1',
  key_hash: 'abc123hash',
  key_prefix: 'abc12345',
  status: ApiKeyStatus.Active,
  created_at: new Date(),
  expires_at: null,
  last_used_at: null,
};

describe('product.service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createProduct', () => {
    it('creates a product when slug is unique', async () => {
      mockRepo.findBySlug.mockResolvedValue(null);
      mockRepo.createProduct.mockResolvedValue(fakeProduct);

      const result = await productService.createProduct('Test SaaS', 'test-saas');
      expect(result).toEqual(fakeProduct);
      expect(mockRepo.createProduct).toHaveBeenCalledWith('Test SaaS', 'test-saas');
    });

    it('throws ConflictError when slug is already taken', async () => {
      mockRepo.findBySlug.mockResolvedValue(fakeProduct);

      await expect(productService.createProduct('Other', 'test-saas'))
        .rejects.toMatchObject({ code: 'DUPLICATE_SLUG' });
    });
  });

  describe('getProduct', () => {
    it('returns product when found', async () => {
      mockRepo.findById.mockResolvedValue(fakeProduct);
      const result = await productService.getProduct('prod-1');
      expect(result).toEqual(fakeProduct);
    });

    it('throws NotFoundError when product does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(productService.getProduct('missing'))
        .rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('authenticateProductApiKey', () => {
    beforeEach(() => {
      (hashApiKey as jest.Mock).mockReturnValue('abc123hash');
      // generateApiKey not used here, hashApiKey is
      jest.mocked(require('../../../src/crypto/apiKeys').verifyApiKey).mockReturnValue(true);
    });

    it('returns product for valid key', async () => {
      mockRepo.findActiveApiKeyByHash.mockResolvedValue(fakeApiKey);
      mockRepo.findById.mockResolvedValue(fakeProduct);
      mockRepo.touchApiKeyLastUsed.mockResolvedValue(undefined);

      const result = await productService.authenticateProductApiKey('valid-raw-key');
      expect(result).toEqual(fakeProduct);
    });

    it('throws UnauthorizedError for unknown key', async () => {
      mockRepo.findActiveApiKeyByHash.mockResolvedValue(null);
      await expect(productService.authenticateProductApiKey('bad-key'))
        .rejects.toMatchObject({ code: 'INVALID_API_KEY', statusCode: 401 });
    });

    it('throws for inactive product', async () => {
      const inactiveProduct = { ...fakeProduct, status: ProductStatus.Suspended };
      mockRepo.findActiveApiKeyByHash.mockResolvedValue(fakeApiKey);
      mockRepo.findById.mockResolvedValue(inactiveProduct);

      await expect(productService.authenticateProductApiKey('valid-key'))
        .rejects.toMatchObject({ code: 'PRODUCT_INACTIVE', statusCode: 401 });
    });
  });
});
