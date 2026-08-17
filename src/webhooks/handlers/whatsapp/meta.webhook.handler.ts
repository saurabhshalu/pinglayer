import { v4 as uuidv4 } from 'uuid';
import { execute, queryOne } from '../../../db/pool';
import { updateDeliveryStatus } from '../../../services/notification.service';
import { NotificationStatus, Provider, Channel } from '../../../types';
import { logger } from '../../../utils/logger';

type MetaWebhookEntry = {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        errors?: Array<{ code: number; title: string }>;
      }>;
      messages?: Array<{
        id: string;
        from: string;
        type: string;
        timestamp: string;
        text?: { body: string };
      }>;
    };
    field: string;
  }>;
};

type MetaWebhookPayload = {
  object: string;
  entry: MetaWebhookEntry[];
};

const OPT_OUT_KEYWORDS = new Set(['stop', 'unsubscribe', 'cancel', 'quit', 'end', 'optout', 'opt-out']);
const OPT_IN_KEYWORDS  = new Set(['start', 'subscribe', 'unstop', 'optin', 'opt-in', 'yes']);

function mapMetaStatus(metaStatus: string): NotificationStatus {
  switch (metaStatus) {
    case 'sent':      return NotificationStatus.Sent;
    case 'delivered': return NotificationStatus.Delivered;
    case 'read':      return NotificationStatus.Read;
    case 'failed':    return NotificationStatus.Failed;
    default:          return NotificationStatus.Sent;
  }
}

async function storeWebhookEvent(payload: unknown): Promise<string> {
  const id = uuidv4();
  await execute(
    `INSERT INTO webhook_events (id, provider, channel, raw_payload) VALUES (?, ?, ?, ?)`,
    [id, Provider.Meta, Channel.WhatsApp, JSON.stringify(payload)]
  );
  return id;
}

async function markWebhookProcessed(id: string, error?: string): Promise<void> {
  await execute(
    `UPDATE webhook_events SET processed = 1, processed_at = NOW(), error = ? WHERE id = ?`,
    [error ?? null, id]
  );
}

async function findConnectionByPhoneNumberId(
  phoneNumberId: string
): Promise<{ product_id: string; tenant_id: string } | null> {
  return queryOne<{ product_id: string; tenant_id: string }>(
    `SELECT product_id, tenant_id FROM connections
     WHERE JSON_UNQUOTE(JSON_EXTRACT(config, '$.phone_number_id')) = ?
        OR JSON_UNQUOTE(JSON_EXTRACT(config, '$.phoneNumberId')) = ?
     LIMIT 1`,
    [phoneNumberId, phoneNumberId]
  );
}

async function recordOptOut(
  productId: string,
  tenantId: string,
  channel: Channel,
  recipient: string
): Promise<void> {
  await execute(
    `INSERT INTO opt_outs (id, product_id, tenant_id, channel, recipient, source)
     VALUES (?, ?, ?, ?, ?, 'inbound_message')
     ON DUPLICATE KEY UPDATE opted_out_at = NOW(), source = 'inbound_message'`,
    [uuidv4(), productId, tenantId, channel, recipient]
  );
  logger.info('Opt-out recorded', { productId, tenantId, channel, recipient });
}

async function removeOptOut(
  productId: string,
  tenantId: string,
  channel: Channel,
  recipient: string
): Promise<void> {
  await execute(
    `DELETE FROM opt_outs WHERE product_id = ? AND tenant_id = ? AND channel = ? AND recipient = ?`,
    [productId, tenantId, channel, recipient]
  );
  logger.info('Opt-in: opt-out removed', { productId, tenantId, channel, recipient });
}

async function handleInboundMessage(
  phoneNumberId: string,
  from: string,
  text: string | undefined
): Promise<void> {
  if (!text) return;

  const normalised = text.trim().toLowerCase();
  const isOptOut = OPT_OUT_KEYWORDS.has(normalised);
  const isOptIn  = OPT_IN_KEYWORDS.has(normalised);

  if (!isOptOut && !isOptIn) return;

  const connection = await findConnectionByPhoneNumberId(phoneNumberId);
  if (!connection) {
    logger.warn('Inbound opt keyword received but no matching connection found', { phoneNumberId, from });
    return;
  }

  if (isOptOut) {
    await recordOptOut(connection.product_id, connection.tenant_id, Channel.WhatsApp, from);
  } else {
    await removeOptOut(connection.product_id, connection.tenant_id, Channel.WhatsApp, from);
  }
}

export async function handleMetaWebhook(payload: unknown): Promise<void> {
  const eventId = await storeWebhookEvent(payload);

  try {
    const data = payload as MetaWebhookPayload;
    if (data.object !== 'whatsapp_business_account') {
      logger.warn('Unexpected Meta webhook object type', { object: data.object });
      await markWebhookProcessed(eventId);
      return;
    }

    for (const entry of data.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        const phoneNumberId = change.value.metadata.phone_number_id;

        for (const status of change.value.statuses ?? []) {
          const normalizedStatus = mapMetaStatus(status.status);
          logger.info('Meta status update', { messageId: status.id, status: normalizedStatus });
          await updateDeliveryStatus(status.id, normalizedStatus);
        }

        for (const message of change.value.messages ?? []) {
          logger.info('Incoming WhatsApp message', {
            messageId: message.id,
            from: message.from,
            type: message.type,
          });

          if (message.type === 'text') {
            await handleInboundMessage(phoneNumberId, message.from, message.text?.body);
          }
        }
      }
    }

    await markWebhookProcessed(eventId);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Meta webhook processing failed', { eventId, error: errorMsg });
    await markWebhookProcessed(eventId, errorMsg);
    throw err;
  }
}
