import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, withTransaction } from '../db/pool';
import { Connection, Channel, Provider, AuthMethod, ConnectionStatus } from '../types';
import { EncryptedPayload } from '../crypto/credentials';

export interface CreateConnectionInput {
  productId: string;
  tenantId: string;
  channel: Channel;
  provider: Provider;
  authMethod: AuthMethod;
  config?: Record<string, unknown>;
}

export interface ConnectionRow extends Omit<Connection, 'config'> {
  config: string;
}

function parseConnection(row: ConnectionRow): Connection {
  return {
    ...row,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
  };
}

export async function createConnection(
  input: CreateConnectionInput,
  credentials: EncryptedPayload
): Promise<Connection> {
  return withTransaction(async (conn) => {
    const id = uuidv4();
    const credId = uuidv4();
    const config = JSON.stringify(input.config ?? {});

    await conn.query(
      `INSERT INTO connections (id, product_id, tenant_id, channel, provider, auth_method, status, config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.productId, input.tenantId, input.channel, input.provider, input.authMethod, ConnectionStatus.Pending, config]
    );

    await conn.query(
      'INSERT INTO connection_credentials (id, connection_id, encrypted_data, iv, tag) VALUES (?, ?, ?, ?, ?)',
      [credId, id, credentials.data, credentials.iv, credentials.tag]
    );

    const [rows] = await conn.query('SELECT * FROM connections WHERE id = ?', [id]);
    const row = (rows as ConnectionRow[])[0];
    return parseConnection(row);
  });
}

export async function findById(id: string): Promise<Connection | null> {
  const row = await queryOne<ConnectionRow>('SELECT * FROM connections WHERE id = ?', [id]);
  return row ? parseConnection(row) : null;
}

export async function findByProductAndTenant(
  productId: string,
  tenantId: string,
  channel?: Channel,
  status?: ConnectionStatus
): Promise<Connection[]> {
  const conditions = ['product_id = ?', 'tenant_id = ?'];
  const params: unknown[] = [productId, tenantId];

  if (channel) { conditions.push('channel = ?'); params.push(channel); }
  if (status) { conditions.push('status = ?'); params.push(status); }

  const rows = await query<ConnectionRow>(
    `SELECT * FROM connections WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params
  );
  return rows.map(parseConnection);
}

export async function findActiveByProductTenantChannel(
  productId: string,
  tenantId: string,
  channel: Channel
): Promise<Connection | null> {
  const row = await queryOne<ConnectionRow>(
    `SELECT * FROM connections
     WHERE product_id = ? AND tenant_id = ? AND channel = ? AND status = 'active'
     LIMIT 1`,
    [productId, tenantId, channel]
  );
  return row ? parseConnection(row) : null;
}

export async function findByProduct(
  productId: string,
  limit = 50,
  offset = 0
): Promise<{ rows: Connection[]; total: number }> {
  const [rows, totalRow] = await Promise.all([
    query<ConnectionRow>(
      'SELECT * FROM connections WHERE product_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [productId, limit, offset]
    ),
    queryOne<{ total: number }>(
      'SELECT COUNT(*) as total FROM connections WHERE product_id = ?',
      [productId]
    ),
  ]);
  return { rows: rows.map(parseConnection), total: totalRow?.total ?? 0 };
}

export async function updateConnection(
  id: string,
  updates: Partial<Pick<Connection, 'status' | 'config'>>
): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.config !== undefined) { fields.push('config = ?'); params.push(JSON.stringify(updates.config)); }

  if (fields.length === 0) return;
  params.push(id);

  await execute(`UPDATE connections SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function updateCredentials(
  connectionId: string,
  credentials: EncryptedPayload
): Promise<void> {
  await execute(
    `INSERT INTO connection_credentials (id, connection_id, encrypted_data, iv, tag)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE encrypted_data = VALUES(encrypted_data), iv = VALUES(iv), tag = VALUES(tag), updated_at = NOW()`,
    [uuidv4(), connectionId, credentials.data, credentials.iv, credentials.tag]
  );
}

export async function getCredentials(connectionId: string): Promise<EncryptedPayload | null> {
  const row = await queryOne<{ encrypted_data: string; iv: string; tag: string }>(
    'SELECT encrypted_data, iv, tag FROM connection_credentials WHERE connection_id = ?',
    [connectionId]
  );
  if (!row) return null;
  return { data: row.encrypted_data, iv: row.iv, tag: row.tag };
}

export async function deleteConnection(id: string): Promise<void> {
  await execute('DELETE FROM connections WHERE id = ?', [id]);
}

export async function existsByIdentity(
  productId: string,
  tenantId: string,
  channel: Channel,
  provider: Provider,
  excludeId?: string
): Promise<boolean> {
  const sql = excludeId
    ? 'SELECT 1 FROM connections WHERE product_id = ? AND tenant_id = ? AND channel = ? AND provider = ? AND id != ? LIMIT 1'
    : 'SELECT 1 FROM connections WHERE product_id = ? AND tenant_id = ? AND channel = ? AND provider = ? LIMIT 1';
  const params = excludeId
    ? [productId, tenantId, channel, provider, excludeId]
    : [productId, tenantId, channel, provider];
  const rows = await query(sql, params);
  return rows.length > 0;
}

export async function findAll(
  filters: { productId?: string; tenantId?: string; channel?: Channel; status?: ConnectionStatus },
  limit = 50,
  offset = 0
): Promise<{ rows: Connection[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.productId) { conditions.push('product_id = ?'); params.push(filters.productId); }
  if (filters.tenantId) { conditions.push('tenant_id = ?'); params.push(filters.tenantId); }
  if (filters.channel) { conditions.push('channel = ?'); params.push(filters.channel); }
  if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows, totalRow] = await Promise.all([
    query<ConnectionRow>(
      `SELECT * FROM connections ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM connections ${where}`, params),
  ]);
  return { rows: rows.map(parseConnection), total: totalRow?.total ?? 0 };
}
