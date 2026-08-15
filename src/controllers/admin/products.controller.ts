import { Request, Response, NextFunction } from 'express';
import * as productService from '../../services/product.service';
import { createProductSchema, updateProductSchema, validate } from '../../validators/product.validator';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { ProductStatus } from '../../types';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = validate<{ name: string; slug: string }>(createProductSchema, req.body);
    const product = await productService.createProduct(body.name, body.slug);
    sendCreated(res, product);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = parsePagination(req);
    const status = req.query['status'] as ProductStatus | undefined;
    const result = await productService.listProducts(params, status);
    sendPaginated(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productService.getProduct(req.params['id']!);
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = validate<Partial<{ name: string; slug: string; status: ProductStatus }>>(
      updateProductSchema,
      req.body
    );
    const product = await productService.updateProduct(req.params['id']!, body);
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
}

export async function generateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { apiKey, rawKey } = await productService.generateProductApiKey(req.params['id']!);
    // Only time the raw key is returned
    sendCreated(res, {
      id: apiKey.id,
      productId: apiKey.product_id,
      prefix: apiKey.key_prefix,
      apiKey: rawKey,
      status: apiKey.status,
      createdAt: apiKey.created_at,
      expiresAt: apiKey.expires_at,
      note: 'Store this API key securely. It will not be shown again.',
    });
  } catch (err) {
    next(err);
  }
}

export async function rotateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { apiKey, rawKey } = await productService.rotateProductApiKey(
      req.params['id']!,
      req.params['keyId']!
    );
    sendCreated(res, {
      id: apiKey.id,
      productId: apiKey.product_id,
      prefix: apiKey.key_prefix,
      apiKey: rawKey,
      status: apiKey.status,
      createdAt: apiKey.created_at,
      note: 'Store this API key securely. It will not be shown again.',
    });
  } catch (err) {
    next(err);
  }
}

export async function revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await productService.revokeApiKey(req.params['id']!, req.params['keyId']!);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

export async function listApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const keys = await productService.listApiKeys(req.params['id']!);
    // Never return key_hash
    const sanitized = keys.map(({ key_hash: _, ...key }) => key);
    sendSuccess(res, sanitized);
  } catch (err) {
    next(err);
  }
}
