import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db/pool';
import { Product, ProductApiKey, ProductStatus, ApiKeyStatus } from '../types';

export async function createProduct(name: string, slug: string): Promise<Product> {
  const id = uuidv4();
  await execute(
    'INSERT INTO products (id, name, slug, status) VALUES (?, ?, ?, ?)',
    [id, name, slug, ProductStatus.Active]
  );
  return findById(id) as Promise<Product>;
}

export async function findById(id: string): Promise<Product | null> {
  return queryOne<Product>('SELECT * FROM products WHERE id = ?', [id]);
}

export async function findBySlug(slug: string): Promise<Product | null> {
  return queryOne<Product>('SELECT * FROM products WHERE slug = ?', [slug]);
}

export async function findAll(
  status?: ProductStatus,
  limit = 50,
  offset = 0
): Promise<{ rows: Product[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows, totalRows] = await Promise.all([
    query<Product>(`SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [
      ...params,
      limit,
      offset,
    ]),
    queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM products ${where}`, params),
  ]);

  return { rows, total: totalRows?.total ?? 0 };
}

export async function updateProduct(
  id: string,
  updates: Partial<Pick<Product, 'name' | 'slug' | 'status'>>
): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.slug !== undefined) { fields.push('slug = ?'); params.push(updates.slug); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }

  if (fields.length === 0) return;
  params.push(id);

  await execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export async function createApiKey(
  productId: string,
  keyHash: string,
  keyPrefix: string,
  expiresAt?: Date | null
): Promise<ProductApiKey> {
  const id = uuidv4();
  await execute(
    'INSERT INTO product_api_keys (id, product_id, key_hash, key_prefix, status, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, productId, keyHash, keyPrefix, ApiKeyStatus.Active, expiresAt ?? null]
  );
  return findApiKeyById(id) as Promise<ProductApiKey>;
}

export async function findApiKeyById(id: string): Promise<ProductApiKey | null> {
  return queryOne<ProductApiKey>('SELECT * FROM product_api_keys WHERE id = ?', [id]);
}

export async function findActiveApiKeyByHash(keyHash: string): Promise<ProductApiKey | null> {
  return queryOne<ProductApiKey>(
    `SELECT * FROM product_api_keys
     WHERE key_hash = ? AND status = 'active'
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [keyHash]
  );
}

export async function findApiKeysByProductId(productId: string): Promise<ProductApiKey[]> {
  return query<ProductApiKey>(
    'SELECT * FROM product_api_keys WHERE product_id = ? ORDER BY created_at DESC',
    [productId]
  );
}

export async function revokeApiKey(id: string): Promise<void> {
  await execute(
    "UPDATE product_api_keys SET status = 'revoked' WHERE id = ?",
    [id]
  );
}

export async function revokeAllApiKeys(productId: string): Promise<void> {
  await execute(
    "UPDATE product_api_keys SET status = 'revoked' WHERE product_id = ? AND status = 'active'",
    [productId]
  );
}

export async function touchApiKeyLastUsed(id: string): Promise<void> {
  await execute('UPDATE product_api_keys SET last_used_at = NOW() WHERE id = ?', [id]);
}
