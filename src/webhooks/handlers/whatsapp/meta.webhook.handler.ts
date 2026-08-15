import { v4 as uuidv4 } from 'uuid';
import { execute, query } from '../../../db/pool';
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
      }>;
    };
    field: string;
  }>;
};

type MetaWebhookPayload = {
  object: string;
  entry: MetaWebhookEntry[];
};

function mapMetaStatus(metaStatus: string): NotificationStatus {
  switch (metaStatus) {
    case 'sent': return NotificationStatus.Sent;
    case 'delivered': return NotificationStatus.Delivered;
    case 'read': return NotificationStatus.Read;
    case 'failed': return NotificationStatus.Failed;
    default: return NotificationStatus.Sent;
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

        // Handle status updates
        for (const status of change.value.statuses ?? []) {
          const normalizedStatus = mapMetaStatus(status.status);
          logger.info('Meta status update', {
            messageId: status.id,
            status: normalizedStatus,
          });
          await updateDeliveryStatus(status.id, normalizedStatus);
        }

        // Incoming messages — log for now; extend for auto-reply/CRM integration later
        for (const message of change.value.messages ?? []) {
          logger.info('Incoming WhatsApp message', {
            messageId: message.id,
            from: message.from,
            type: message.type,
          });
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
