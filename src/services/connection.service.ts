import * as connectionRepo from '../repositories/connection.repository';
import { encryptCredentials, decryptFromString, decryptCredentials } from '../crypto/credentials';
import { getProvider } from '../providers/registry';
import {
  Connection,
  Channel,
  Provider,
  AuthMethod,
  ConnectionStatus,
  ValidationResult,
  ConnectionStatus_Provider,
  PaginationParams,
  PaginatedResult,
} from '../types';
import { NotFoundError, ConflictError, AppError } from '../utils/errors';
import { ErrorCodes } from '../types';
import { buildPaginatedResult } from '../utils/pagination';
import { logger } from '../utils/logger';

export interface CreateConnectionInput {
  productId: string;
  tenantId: string;
  tenantName?: string | null;
  channel: Channel;
  provider: Provider;
  authMethod?: AuthMethod;
  credentials: Record<string, string>;
  config?: Record<string, unknown>;
}

export interface UpdateConnectionInput {
  tenantName?: string | null;
  credentials?: Record<string, string>;
  config?: Record<string, unknown>;
  status?: ConnectionStatus;
}

export async function createConnection(input: CreateConnectionInput): Promise<Connection> {
  // Check for duplicate
  const existing = await connectionRepo.existsByIdentity(
    input.productId,
    input.tenantId,
    input.channel,
    input.provider
  );
  if (existing) {
    throw new ConflictError(
      ErrorCodes.CONFLICT,
      `A ${input.channel}/${input.provider} connection already exists for this tenant`
    );
  }

  const encrypted = encryptCredentials(input.credentials);
  const connection = await connectionRepo.createConnection(
    {
      productId: input.productId,
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      channel: input.channel,
      provider: input.provider,
      authMethod: input.authMethod ?? AuthMethod.Manual,
      config: input.config,
    },
    encrypted
  );

  logger.info('Connection created', {
    connectionId: connection.id,
    productId: input.productId,
    tenantId: input.tenantId,
    channel: input.channel,
    provider: input.provider,
  });

  return connection;
}

export async function getConnection(id: string, productId: string): Promise<Connection> {
  const connection = await connectionRepo.findById(id);
  if (!connection || connection.product_id !== productId) {
    throw new NotFoundError(ErrorCodes.CONNECTION_NOT_FOUND, `Connection ${id} not found`);
  }
  return connection;
}

export async function listTenantConnections(
  productId: string,
  tenantId: string,
  channel?: Channel,
  status?: ConnectionStatus
): Promise<Connection[]> {
  return connectionRepo.findByProductAndTenant(productId, tenantId, channel, status);
}

export async function listProductConnections(
  productId: string,
  params: PaginationParams
): Promise<PaginatedResult<Connection>> {
  const { rows, total } = await connectionRepo.findByProduct(productId, params.limit, params.offset);
  return buildPaginatedResult(rows, total, params);
}

export async function listAllConnections(
  filters: { productId?: string; tenantId?: string; channel?: Channel; status?: ConnectionStatus },
  params: PaginationParams
): Promise<PaginatedResult<Connection>> {
  const { rows, total } = await connectionRepo.findAll(filters, params.limit, params.offset);
  return buildPaginatedResult(rows, total, params);
}

export async function updateConnection(
  id: string,
  productId: string,
  input: UpdateConnectionInput
): Promise<Connection> {
  const connection = await getConnection(id, productId);

  if (input.credentials && Object.keys(input.credentials).length > 0) {
    const existingPayload = await connectionRepo.getCredentials(id);
    let mergedCredentials = { ...input.credentials };
    if (existingPayload) {
      try {
        const existingCreds = decryptCredentials(existingPayload);
        mergedCredentials = { ...existingCreds, ...input.credentials };
      } catch (err) {
        logger.warn('Failed to decrypt existing credentials during update, replacing with new credentials', {
          connectionId: id,
          err,
        });
      }
    }
    const encrypted = encryptCredentials(mergedCredentials);
    await connectionRepo.updateCredentials(id, encrypted);
  }

  const updates: Partial<Pick<Connection, 'status' | 'config' | 'tenant_name'>> = {};
  if (input.status !== undefined) updates.status = input.status;
  if (input.tenantName !== undefined) updates.tenant_name = input.tenantName;
  if (input.config !== undefined) {
    updates.config = { ...(connection.config || {}), ...input.config };
  }

  if (Object.keys(updates).length > 0) {
    await connectionRepo.updateConnection(id, updates);
  }

  return getConnection(id, productId);
}

export async function deleteConnection(id: string, productId: string): Promise<void> {
  await getConnection(id, productId); // ensures ownership
  await connectionRepo.deleteConnection(id);
}

export async function validateConnection(
  id: string,
  productId: string
): Promise<ValidationResult> {
  const connection = await getConnection(id, productId);
  const credPayload = await connectionRepo.getCredentials(id);

  if (!credPayload) {
    throw new AppError(ErrorCodes.CONNECTION_INVALID, 'No credentials found for this connection');
  }

  const credentials = decryptCredentials(credPayload);
  const provider = getProvider(connection.channel, connection.provider);
  const result = await provider.validateConnection(credentials, connection);

  // Update connection status based on validation result
  const newStatus = result.valid ? ConnectionStatus.Active : ConnectionStatus.Invalid;
  await connectionRepo.updateConnection(id, { status: newStatus });

  return result;
}

export async function testConnection(
  id: string,
  productId: string
): Promise<ConnectionStatus_Provider> {
  const connection = await getConnection(id, productId);
  const credPayload = await connectionRepo.getCredentials(id);

  if (!credPayload) {
    return { connected: false, error: 'No credentials configured' };
  }

  const credentials = decryptCredentials(credPayload);
  const provider = getProvider(connection.channel, connection.provider);
  return provider.getStatus(credentials, connection);
}

export async function getDecryptedCredentials(
  connectionId: string
): Promise<Record<string, string>> {
  const credPayload = await connectionRepo.getCredentials(connectionId);
  if (!credPayload) {
    throw new AppError(ErrorCodes.CONNECTION_INVALID, 'No credentials for connection');
  }
  return decryptCredentials(credPayload);
}
