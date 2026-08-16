import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db/pool';
import {
  Notification,
  NotificationDeliveryAttempt,
  NotificationStatus,
  Channel,
  Provider,
} from '../types';

interface NotificationRow extends Omit<Notification, 'request_metadata' | 'response_metadata'> {
  request_metadata: string;
  response_metadata: string | null;
}

function parseNotification(row: NotificationRow): Notification {
  return {
    ...row,
    request_metadata:
      typeof row.request_metadata === 'string'
        ? JSON.parse(row.request_metadata)
        : row.request_metadata,
    response_metadata:
      row.response_metadata
        ? typeof row.response_metadata === 'string'
          ? JSON.parse(row.response_metadata)
          : row.response_metadata
        : null,
  };
}

export interface CreateNotificationInput {
  productId: string;
  tenantId: string;
  connectionId: string | null;
  channel: Channel;
  provider: Provider | null;
  event: string;
  recipient: string;
  requestMetadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const id = uuidv4();
  await execute(
    `INSERT INTO notifications
       (id, product_id, tenant_id, connection_id, channel, provider, event, recipient, status, request_metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.productId,
      input.tenantId,
      input.connectionId,
      input.channel,
      input.provider,
      input.event,
      input.recipient,
      NotificationStatus.Queued,
      JSON.stringify(input.requestMetadata ?? {}),
    ]
  );
  return findById(id) as Promise<Notification>;
}

export async function findById(id: string): Promise<Notification | null> {
  const row = await queryOne<NotificationRow>(
    `SELECT n.*, c.tenant_name
     FROM notifications n
     LEFT JOIN connections c ON (n.connection_id = c.id OR (n.product_id = c.product_id AND n.tenant_id = c.tenant_id))
     WHERE n.id = ?
     LIMIT 1`,
    [id]
  );
  return row ? parseNotification(row) : null;
}

export async function updateStatus(
  id: string,
  status: NotificationStatus,
  updates?: {
    providerMessageId?: string;
    responseMetadata?: Record<string, unknown>;
    errorCode?: string;
    errorMessage?: string;
  }
): Promise<void> {
  const fields = ['status = ?'];
  const params: unknown[] = [status];

  if (updates?.providerMessageId) { fields.push('provider_message_id = ?'); params.push(updates.providerMessageId); }
  if (updates?.responseMetadata) { fields.push('response_metadata = ?'); params.push(JSON.stringify(updates.responseMetadata)); }
  if (updates?.errorCode !== undefined) { fields.push('error_code = ?'); params.push(updates.errorCode ?? null); }
  if (updates?.errorMessage !== undefined) { fields.push('error_message = ?'); params.push(updates.errorMessage ?? null); }

  params.push(id);
  await execute(`UPDATE notifications SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function updateStatusByProviderMessageId(
  providerMessageId: string,
  status: NotificationStatus
): Promise<void> {
  await execute(
    'UPDATE notifications SET status = ? WHERE provider_message_id = ?',
    [status, providerMessageId]
  );
}

export async function findByProductAndTenant(
  productId: string,
  tenantId?: string,
  filters?: {
    status?: NotificationStatus;
    event?: string;
    channel?: Channel;
    fromDate?: Date;
    toDate?: Date;
  },
  limit = 20,
  offset = 0
): Promise<{ rows: Notification[]; total: number }> {
  const conditions = ['n.product_id = ?'];
  const params: unknown[] = [productId];

  if (tenantId) { conditions.push('n.tenant_id = ?'); params.push(tenantId); }
  if (filters?.status) { conditions.push('n.status = ?'); params.push(filters.status); }
  if (filters?.event) { conditions.push('n.event = ?'); params.push(filters.event); }
  if (filters?.channel) { conditions.push('n.channel = ?'); params.push(filters.channel); }
  if (filters?.fromDate) { conditions.push('n.created_at >= ?'); params.push(filters.fromDate); }
  if (filters?.toDate) { conditions.push('n.created_at <= ?'); params.push(filters.toDate); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const [rows, totalRow] = await Promise.all([
    query<NotificationRow>(
      `SELECT n.*, c.tenant_name
       FROM notifications n
       LEFT JOIN (
         SELECT product_id, tenant_id, MAX(tenant_name) as tenant_name
         FROM connections
         GROUP BY product_id, tenant_id
       ) c ON n.product_id = c.product_id AND n.tenant_id = c.tenant_id
       ${where}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM notifications n ${where}`, params),
  ]);

  return { rows: rows.map(parseNotification), total: totalRow?.total ?? 0 };
}

// ─── Delivery Attempts ────────────────────────────────────────────────────────

export async function createDeliveryAttempt(
  notificationId: string,
  attemptNumber: number,
  status: NotificationStatus,
  providerResponse?: Record<string, unknown>,
  errorCode?: string,
  errorMessage?: string
): Promise<NotificationDeliveryAttempt> {
  const id = uuidv4();
  await execute(
    `INSERT INTO notification_delivery_attempts
       (id, notification_id, attempt_number, status, provider_response, error_code, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      notificationId,
      attemptNumber,
      status,
      providerResponse ? JSON.stringify(providerResponse) : null,
      errorCode ?? null,
      errorMessage ?? null,
    ]
  );
  return findAttemptById(id) as Promise<NotificationDeliveryAttempt>;
}

export async function findAttemptById(id: string): Promise<NotificationDeliveryAttempt | null> {
  return queryOne<NotificationDeliveryAttempt>(
    'SELECT * FROM notification_delivery_attempts WHERE id = ?',
    [id]
  );
}

export async function findAttemptsByNotificationId(
  notificationId: string
): Promise<NotificationDeliveryAttempt[]> {
  return query<NotificationDeliveryAttempt>(
    'SELECT * FROM notification_delivery_attempts WHERE notification_id = ? ORDER BY attempt_number',
    [notificationId]
  );
}
