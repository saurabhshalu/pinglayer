import * as templateRepo from '../repositories/template.repository';
import * as connectionRepo from '../repositories/connection.repository';
import {
  NotificationDefinition,
  NotificationTemplateMapping,
  Channel,
  Provider,
  NotificationDefinitionStatus,
  TemplateMappingStatus,
  PaginationParams,
  PaginatedResult,
} from '../types';
import { NotFoundError, ConflictError, AppError } from '../utils/errors';
import { ErrorCodes } from '../types';
import { buildPaginatedResult } from '../utils/pagination';

// ─── Notification Definitions ─────────────────────────────────────────────────

export async function createDefinition(
  productId: string,
  key: string,
  name: string,
  description: string | null,
  channels: Channel[]
): Promise<NotificationDefinition> {
  const existing = await templateRepo.findDefinitionByKey(productId, key);
  if (existing) {
    throw new ConflictError(ErrorCodes.DUPLICATE_KEY, `Notification key "${key}" already exists for this product`);
  }
  return templateRepo.createDefinition(productId, key, name, description, channels);
}

export async function getDefinition(id: string, productId: string): Promise<NotificationDefinition> {
  const def = await templateRepo.findDefinitionById(id);
  if (!def || def.product_id !== productId) {
    throw new NotFoundError(ErrorCodes.DEFINITION_NOT_FOUND, `Notification definition ${id} not found`);
  }
  return def;
}

export async function getDefinitionByKey(
  productId: string,
  key: string
): Promise<NotificationDefinition> {
  const def = await templateRepo.findDefinitionByKey(productId, key);
  if (!def) {
    throw new NotFoundError(
      ErrorCodes.DEFINITION_NOT_FOUND,
      `Notification definition "${key}" not configured for this product`
    );
  }
  return def;
}

export async function listDefinitions(
  productId: string,
  params: PaginationParams
): Promise<PaginatedResult<NotificationDefinition>> {
  const { rows, total } = await templateRepo.findDefinitionsByProduct(productId, params.limit, params.offset);
  return buildPaginatedResult(rows, total, params);
}

export async function updateDefinition(
  id: string,
  productId: string,
  updates: Partial<Pick<NotificationDefinition, 'name' | 'description' | 'channels' | 'status'>>
): Promise<NotificationDefinition> {
  await getDefinition(id, productId);
  await templateRepo.updateDefinition(id, updates);
  return getDefinition(id, productId);
}

export async function deleteDefinition(id: string, productId: string): Promise<void> {
  await getDefinition(id, productId);
  await templateRepo.deleteDefinition(id);
}

// ─── Template Mappings ────────────────────────────────────────────────────────

export async function createMapping(
  productId: string,
  definitionId: string,
  connectionId: string,
  providerTemplateName: string,
  providerTemplateLanguage: string,
  variableMapping: Record<string, string>
): Promise<NotificationTemplateMapping> {
  // Verify definition belongs to product
  const def = await getDefinition(definitionId, productId);

  // Verify connection belongs to product
  const conn = await connectionRepo.findById(connectionId);
  if (!conn || conn.product_id !== productId) {
    throw new NotFoundError(ErrorCodes.CONNECTION_NOT_FOUND, `Connection ${connectionId} not found`);
  }

  // Check for duplicate
  const existing = await templateRepo.findMappingByDefinitionAndConnection(definitionId, connectionId);
  if (existing) {
    throw new ConflictError(
      ErrorCodes.CONFLICT,
      'A template mapping already exists for this definition and connection'
    );
  }

  return templateRepo.createMapping(
    definitionId,
    connectionId,
    conn.channel,
    conn.provider,
    providerTemplateName,
    providerTemplateLanguage,
    variableMapping
  );
}

export async function getMapping(id: string, productId: string): Promise<NotificationTemplateMapping> {
  const mapping = await templateRepo.findMappingById(id);
  if (!mapping) {
    throw new NotFoundError(ErrorCodes.TEMPLATE_NOT_FOUND, `Template mapping ${id} not found`);
  }
  // Verify ownership through the connection
  const conn = await connectionRepo.findById(mapping.connection_id);
  if (!conn || conn.product_id !== productId) {
    throw new NotFoundError(ErrorCodes.TEMPLATE_NOT_FOUND, `Template mapping ${id} not found`);
  }
  return mapping;
}

export async function resolveMapping(
  productId: string,
  tenantId: string,
  event: string,
  channel: Channel
): Promise<{
  definition: NotificationDefinition;
  mapping: NotificationTemplateMapping;
  connectionId: string;
}> {
  const definition = await getDefinitionByKey(productId, event);

  if (definition.status !== NotificationDefinitionStatus.Active) {
    throw new AppError(
      ErrorCodes.TEMPLATE_NOT_CONFIGURED,
      `Notification definition "${event}" is not active`,
      400
    );
  }

  // Find active connection for this tenant/channel
  const connection = await connectionRepo.findActiveByProductTenantChannel(productId, tenantId, channel);
  if (!connection) {
    throw new NotFoundError(
      ErrorCodes.CONNECTION_NOT_FOUND,
      `No active ${channel} connection for this tenant`
    );
  }

  // Find template mapping
  const mapping = await templateRepo.findMappingByDefinitionAndConnection(definition.id, connection.id);
  if (!mapping) {
    throw new NotFoundError(
      ErrorCodes.TEMPLATE_NOT_CONFIGURED,
      `No template configured for event "${event}" on this tenant's ${channel} connection`
    );
  }

  if (mapping.status !== TemplateMappingStatus.Active) {
    throw new AppError(
      ErrorCodes.TEMPLATE_NOT_CONFIGURED,
      `Template mapping for "${event}" is not active`,
      400
    );
  }

  return { definition, mapping, connectionId: connection.id };
}

export async function validateTemplateVariables(
  mapping: NotificationTemplateMapping,
  data: Record<string, unknown>
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  const missing: string[] = [];

  for (const [position, dataKey] of Object.entries(mapping.variable_mapping)) {
    const value = data[dataKey];
    if (value === undefined || value === null) {
      missing.push(dataKey);
    } else {
      resolved[position] = String(value);
    }
  }

  if (missing.length > 0) {
    throw new AppError(
      ErrorCodes.TEMPLATE_VARIABLE_MISSING,
      `Missing template variables: ${missing.join(', ')}`,
      422
    );
  }

  return resolved;
}

export async function listMappingsByDefinition(
  definitionId: string,
  productId: string
): Promise<NotificationTemplateMapping[]> {
  await getDefinition(definitionId, productId);
  return templateRepo.findMappingsByDefinition(definitionId);
}

export async function updateMapping(
  id: string,
  productId: string,
  updates: Partial<Pick<NotificationTemplateMapping, 'provider_template_name' | 'provider_template_language' | 'variable_mapping' | 'status'>>
): Promise<NotificationTemplateMapping> {
  await getMapping(id, productId);
  await templateRepo.updateMapping(id, updates);
  return getMapping(id, productId);
}

export async function deleteMapping(id: string, productId: string): Promise<void> {
  await getMapping(id, productId);
  await templateRepo.deleteMapping(id);
}
