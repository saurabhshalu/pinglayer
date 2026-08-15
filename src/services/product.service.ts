import * as productRepo from '../repositories/product.repository';
import { generateApiKey, hashApiKey, verifyApiKey } from '../crypto/apiKeys';
import { Product, ProductApiKey, ProductStatus, ApiKeyStatus } from '../types';
import { AppError, NotFoundError, ConflictError, UnauthorizedError } from '../utils/errors';
import { ErrorCodes } from '../types';
import { PaginationParams, PaginatedResult } from '../types';
import { buildPaginatedResult } from '../utils/pagination';

export async function createProduct(name: string, slug: string): Promise<Product> {
  const existing = await productRepo.findBySlug(slug);
  if (existing) {
    throw new ConflictError(ErrorCodes.DUPLICATE_SLUG, `A product with slug "${slug}" already exists`);
  }
  return productRepo.createProduct(name, slug);
}

export async function getProduct(id: string): Promise<Product> {
  const product = await productRepo.findById(id);
  if (!product) throw new NotFoundError(ErrorCodes.PRODUCT_NOT_FOUND, `Product ${id} not found`);
  return product;
}

export async function listProducts(
  params: PaginationParams,
  status?: ProductStatus
): Promise<PaginatedResult<Product>> {
  const { rows, total } = await productRepo.findAll(status, params.limit, params.offset);
  return buildPaginatedResult(rows, total, params);
}

export async function updateProduct(
  id: string,
  updates: Partial<Pick<Product, 'name' | 'slug' | 'status'>>
): Promise<Product> {
  const product = await getProduct(id);

  if (updates.slug && updates.slug !== product.slug) {
    const existing = await productRepo.findBySlug(updates.slug);
    if (existing) {
      throw new ConflictError(ErrorCodes.DUPLICATE_SLUG, `Slug "${updates.slug}" is already taken`);
    }
  }

  await productRepo.updateProduct(id, updates);
  return getProduct(id);
}

export async function generateProductApiKey(
  productId: string
): Promise<{ apiKey: ProductApiKey; rawKey: string }> {
  await getProduct(productId); // throws if not found
  const { raw, hash, prefix } = generateApiKey();
  const apiKey = await productRepo.createApiKey(productId, hash, prefix, null);
  return { apiKey, rawKey: raw };
}

export async function rotateProductApiKey(
  productId: string,
  keyId: string
): Promise<{ apiKey: ProductApiKey; rawKey: string }> {
  await getProduct(productId);
  const existing = await productRepo.findApiKeyById(keyId);
  if (!existing || existing.product_id !== productId) {
    throw new NotFoundError(ErrorCodes.PRODUCT_NOT_FOUND, 'API key not found for this product');
  }

  await productRepo.revokeApiKey(keyId);
  return generateProductApiKey(productId);
}

export async function revokeApiKey(productId: string, keyId: string): Promise<void> {
  const key = await productRepo.findApiKeyById(keyId);
  if (!key || key.product_id !== productId) {
    throw new NotFoundError(ErrorCodes.PRODUCT_NOT_FOUND, 'API key not found');
  }
  await productRepo.revokeApiKey(keyId);
}

export async function listApiKeys(productId: string): Promise<ProductApiKey[]> {
  await getProduct(productId);
  return productRepo.findApiKeysByProductId(productId);
}

export async function authenticateProductApiKey(
  rawKey: string
): Promise<Product> {
  const keyHash = hashApiKey(rawKey);
  const apiKey = await productRepo.findActiveApiKeyByHash(keyHash);

  if (!apiKey) {
    throw new UnauthorizedError('Invalid or revoked API key', ErrorCodes.INVALID_API_KEY);
  }

  // Constant-time verify
  if (!verifyApiKey(rawKey, apiKey.key_hash)) {
    throw new UnauthorizedError('Invalid API key', ErrorCodes.INVALID_API_KEY);
  }

  const product = await productRepo.findById(apiKey.product_id);
  if (!product) {
    throw new UnauthorizedError('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  if (product.status !== ProductStatus.Active) {
    throw new UnauthorizedError(
      `Product is ${product.status}`,
      ErrorCodes.PRODUCT_INACTIVE
    );
  }

  // Fire-and-forget update of last_used_at
  productRepo.touchApiKeyLastUsed(apiKey.id).catch(() => undefined);

  return product;
}
