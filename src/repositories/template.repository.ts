import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db/pool';
import {
  NotificationDefinition,
  NotificationTemplateMapping,
  NotificationDefinitionStatus,
  TemplateMappingStatus,
  Channel,
  Provider,
} from '../types';

interface DefinitionRow extends Omit<NotificationDefinition, 'channels'> {
  channels: string;
}

function parseDefinition(row: DefinitionRow): NotificationDefinition {
  return {
    ...row,
    channels: typeof row.channels === 'string' ? JSON.parse(row.channels) : row.channels,
  };
}

interface MappingRow extends Omit<NotificationTemplateMapping, 'variable_mapping'> {
  variable_mapping: string;
}

function parseMapping(row: MappingRow): NotificationTemplateMapping {
  return {
    ...row,
    variable_mapping:
      typeof row.variable_mapping === 'string'
        ? JSON.parse(row.variable_mapping)
        : row.variable_mapping,
  };
}

// ─── Notification Definitions ─────────────────────────────────────────────────

export async function createDefinition(
  productId: string,
  key: string,
  name: string,
  description: string | null,
  channels: Channel[]
): Promise<NotificationDefinition> {
  const id = uuidv4();
  await execute(
    `INSERT INTO notification_definitions (id, product_id, \`key\`, name, description, channels, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, productId, key, name, description, JSON.stringify(channels), NotificationDefinitionStatus.Active]
  );
  return findDefinitionById(id) as Promise<NotificationDefinition>;
}

export async function findDefinitionById(id: string): Promise<NotificationDefinition | null> {
  const row = await queryOne<DefinitionRow>('SELECT * FROM notification_definitions WHERE id = ?', [id]);
  return row ? parseDefinition(row) : null;
}

export async function findDefinitionByKey(
  productId: string,
  key: string
): Promise<NotificationDefinition | null> {
  const row = await queryOne<DefinitionRow>(
    'SELECT * FROM notification_definitions WHERE product_id = ? AND `key` = ?',
    [productId, key]
  );
  return row ? parseDefinition(row) : null;
}

export async function findDefinitionsByProduct(
  productId: string,
  limit = 50,
  offset = 0
): Promise<{ rows: NotificationDefinition[]; total: number }> {
  const [rows, totalRow] = await Promise.all([
    query<DefinitionRow>(
      'SELECT * FROM notification_definitions WHERE product_id = ? ORDER BY `key` LIMIT ? OFFSET ?',
      [productId, limit, offset]
    ),
    queryOne<{ total: number }>(
      'SELECT COUNT(*) as total FROM notification_definitions WHERE product_id = ?',
      [productId]
    ),
  ]);
  return { rows: rows.map(parseDefinition), total: totalRow?.total ?? 0 };
}

export async function updateDefinition(
  id: string,
  updates: Partial<Pick<NotificationDefinition, 'name' | 'description' | 'channels' | 'status'>>
): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
  if (updates.channels !== undefined) { fields.push('channels = ?'); params.push(JSON.stringify(updates.channels)); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }

  if (fields.length === 0) return;
  params.push(id);
  await execute(`UPDATE notification_definitions SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deleteDefinition(id: string): Promise<void> {
  await execute('DELETE FROM notification_definitions WHERE id = ?', [id]);
}

// ─── Template Mappings ────────────────────────────────────────────────────────

export async function createMapping(
  definitionId: string,
  connectionId: string,
  channel: Channel,
  provider: Provider,
  providerTemplateName: string,
  providerTemplateLanguage: string,
  variableMapping: Record<string, string>
): Promise<NotificationTemplateMapping> {
  const id = uuidv4();
  await execute(
    `INSERT INTO notification_template_mappings
       (id, notification_definition_id, connection_id, channel, provider,
        provider_template_name, provider_template_language, variable_mapping, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, definitionId, connectionId, channel, provider,
      providerTemplateName, providerTemplateLanguage,
      JSON.stringify(variableMapping), TemplateMappingStatus.Active,
    ]
  );
  return findMappingById(id) as Promise<NotificationTemplateMapping>;
}

export async function findMappingById(id: string): Promise<NotificationTemplateMapping | null> {
  const row = await queryOne<MappingRow>(
    'SELECT * FROM notification_template_mappings WHERE id = ?',
    [id]
  );
  return row ? parseMapping(row) : null;
}

export async function findMappingByDefinitionAndConnection(
  definitionId: string,
  connectionId: string
): Promise<NotificationTemplateMapping | null> {
  const row = await queryOne<MappingRow>(
    `SELECT * FROM notification_template_mappings
     WHERE notification_definition_id = ? AND connection_id = ? AND status = 'active'`,
    [definitionId, connectionId]
  );
  return row ? parseMapping(row) : null;
}

export async function findMappingsByDefinition(
  definitionId: string
): Promise<NotificationTemplateMapping[]> {
  const rows = await query<MappingRow>(
    `SELECT m.*, c.tenant_id, c.tenant_name
     FROM notification_template_mappings m
     LEFT JOIN connections c ON m.connection_id = c.id
     WHERE m.notification_definition_id = ?
     ORDER BY m.created_at`,
    [definitionId]
  );
  return rows.map(parseMapping);
}

export async function findMappingsByConnection(
  connectionId: string
): Promise<NotificationTemplateMapping[]> {
  const rows = await query<MappingRow>(
    'SELECT * FROM notification_template_mappings WHERE connection_id = ? ORDER BY created_at',
    [connectionId]
  );
  return rows.map(parseMapping);
}

export async function updateMapping(
  id: string,
  updates: Partial<
    Pick<
      NotificationTemplateMapping,
      | 'provider_template_name'
      | 'provider_template_language'
      | 'variable_mapping'
      | 'status'
    >
  >
): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.provider_template_name !== undefined) { fields.push('provider_template_name = ?'); params.push(updates.provider_template_name); }
  if (updates.provider_template_language !== undefined) { fields.push('provider_template_language = ?'); params.push(updates.provider_template_language); }
  if (updates.variable_mapping !== undefined) { fields.push('variable_mapping = ?'); params.push(JSON.stringify(updates.variable_mapping)); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }

  if (fields.length === 0) return;
  params.push(id);
  await execute(`UPDATE notification_template_mappings SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deleteMapping(id: string): Promise<void> {
  await execute('DELETE FROM notification_template_mappings WHERE id = ?', [id]);
}
