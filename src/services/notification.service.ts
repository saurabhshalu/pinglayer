import * as notificationRepo from '../repositories/notification.repository';
import * as connectionRepo from '../repositories/connection.repository';
import * as templateService from './template.service';
import * as connectionService from './connection.service';
import { getProvider } from '../providers/registry';
import {
  Notification,
  NotificationDeliveryAttempt,
  NotificationStatus,
  Channel,
  PaginationParams,
  PaginatedResult,
} from '../types';
import { AppError } from '../utils/errors';
import { ErrorCodes } from '../types';
import { buildPaginatedResult } from '../utils/pagination';
import { logger } from '../utils/logger';
import { queryOne } from '../db/pool';

export interface SendNotificationInput {
  productId: string;
  tenantId: string;
  event: string;
  recipient: string;
  data: Record<string, unknown>;
  channel?: Channel;
}

export interface SendNotificationResult {
  notificationId: string;
  status: NotificationStatus;
  providerMessageId?: string;
  channel: Channel;
  error?: { code: string; message: string };
}

export async function sendNotification(
  input: SendNotificationInput
): Promise<SendNotificationResult> {
  const channel = input.channel ?? Channel.WhatsApp;

  // 1. Resolve event → definition + mapping + connection
  const { definition, mapping, connectionId } = await templateService.resolveMapping(
    input.productId,
    input.tenantId,
    input.event,
    channel as Channel
  );

  // 2. Get connection details
  const connection = await connectionRepo.findById(connectionId);
  if (!connection) {
    throw new AppError(ErrorCodes.CONNECTION_NOT_FOUND, 'Connection not found', 500);
  }

  // 2a. Check if recipient has opted out for this tenant + channel
  const optOut = await queryOne<{ id: string }>(
    `SELECT id FROM opt_outs
     WHERE product_id = ? AND tenant_id = ? AND channel = ? AND recipient = ? LIMIT 1`,
    [input.productId, input.tenantId, channel, input.recipient]
  );
  if (optOut) {
    logger.info('Notification skipped — recipient opted out', {
      productId: input.productId,
      tenantId: input.tenantId,
      channel,
      recipient: input.recipient,
      event: input.event,
    });
    const notification = await notificationRepo.createNotification({
      productId: input.productId,
      tenantId: input.tenantId,
      connectionId,
      channel: connection.channel,
      provider: connection.provider,
      event: input.event,
      recipient: input.recipient,
      requestMetadata: { event: input.event, definitionId: definition.id, mappingId: mapping.id },
    });
    await notificationRepo.updateStatus(notification.id, NotificationStatus.OptedOut, {
      errorCode: ErrorCodes.RECIPIENT_OPTED_OUT,
      errorMessage: 'Recipient has opted out of notifications on this channel',
    });
    return {
      notificationId: notification.id,
      status: NotificationStatus.OptedOut,
      channel: connection.channel,
      error: {
        code: ErrorCodes.RECIPIENT_OPTED_OUT,
        message: 'Recipient has opted out of notifications on this channel',
      },
    };
  }

  // 3. Validate and resolve template variables
  const resolvedVariables = await templateService.validateTemplateVariables(mapping, input.data);

  // 4. Create notification record (status: queued)
  const notification = await notificationRepo.createNotification({
    productId: input.productId,
    tenantId: input.tenantId,
    connectionId,
    channel: connection.channel,
    provider: connection.provider,
    event: input.event,
    recipient: input.recipient,
    requestMetadata: {
      event: input.event,
      definitionId: definition.id,
      mappingId: mapping.id,
      templateName: mapping.provider_template_name,
    },
  });

  // 5. Update to processing
  await notificationRepo.updateStatus(notification.id, NotificationStatus.Processing);

  // 6. Get provider and decrypted credentials
  const provider = getProvider(connection.channel, connection.provider);
  let credentials: Record<string, string>;
  try {
    credentials = await connectionService.getDecryptedCredentials(connectionId);
  } catch {
    await notificationRepo.updateStatus(notification.id, NotificationStatus.Failed, {
      errorCode: ErrorCodes.CONNECTION_INVALID,
      errorMessage: 'Failed to load connection credentials',
    });
    await notificationRepo.createDeliveryAttempt(
      notification.id,
      1,
      NotificationStatus.Failed,
      undefined,
      ErrorCodes.CONNECTION_INVALID,
      'Failed to load connection credentials'
    );
    return {
      notificationId: notification.id,
      status: NotificationStatus.Failed,
      channel: connection.channel,
      error: { code: ErrorCodes.CONNECTION_INVALID, message: 'Failed to load credentials' },
    };
  }

  // 7. Build components for WhatsApp template
  // Numeric keys (e.g. '1', '2') → body component parameters
  // button_{buttonIndex}_{varIndex} keys → button URL components
  const bodyParams = Object.entries(resolvedVariables)
    .filter(([key]) => /^\d+$/.test(key))
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([, text]) => ({ type: 'text', text }));

  const buttonMap = new Map<number, Array<{ varIndex: number; text: string }>>();
  for (const [key, text] of Object.entries(resolvedVariables)) {
    const match = key.match(/^button_(\d+)_(\d+)$/);
    if (match) {
      const buttonIndex = parseInt(match[1]);
      const varIndex = parseInt(match[2]);
      if (!buttonMap.has(buttonIndex)) buttonMap.set(buttonIndex, []);
      buttonMap.get(buttonIndex)!.push({ varIndex, text });
    }
  }
  const buttonComponents = [...buttonMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([buttonIndex, vars]) => ({
      type: 'button',
      sub_type: 'url',
      index: String(buttonIndex),
      parameters: vars
        .sort((a, b) => a.varIndex - b.varIndex)
        .map(({ text }) => ({ type: 'text', text })),
    }));

  const components = [
    ...(bodyParams.length > 0 ? [{ type: 'body', parameters: bodyParams }] : []),
    ...buttonComponents,
  ];

  // 8. Send through provider
  const sendResult = await provider.send(
    {
      recipient: input.recipient,
      templateName: mapping.provider_template_name,
      templateLanguage: mapping.provider_template_language,
      variables: resolvedVariables,
      metadata: { components },
    },
    credentials,
    connection
  );

  logger.info('Notification send result', {
    notificationId: notification.id,
    success: sendResult.success,
    providerMessageId: sendResult.providerMessageId,
  });

  // 9. Update notification record with result
  if (sendResult.success) {
    await notificationRepo.updateStatus(notification.id, NotificationStatus.Sent, {
      providerMessageId: sendResult.providerMessageId,
      responseMetadata: sendResult.providerResponse,
    });
    await notificationRepo.createDeliveryAttempt(
      notification.id,
      1,
      NotificationStatus.Sent,
      sendResult.providerResponse
    );
    return {
      notificationId: notification.id,
      status: NotificationStatus.Sent,
      providerMessageId: sendResult.providerMessageId,
      channel: connection.channel,
    };
  } else {
    await notificationRepo.updateStatus(notification.id, NotificationStatus.Failed, {
      responseMetadata: sendResult.providerResponse,
      errorCode: sendResult.error?.code,
      errorMessage: sendResult.error?.message,
    });
    await notificationRepo.createDeliveryAttempt(
      notification.id,
      1,
      NotificationStatus.Failed,
      sendResult.providerResponse,
      sendResult.error?.code,
      sendResult.error?.message
    );
    return {
      notificationId: notification.id,
      status: NotificationStatus.Failed,
      channel: connection.channel,
      error: sendResult.error
        ? { code: sendResult.error.code, message: sendResult.error.message }
        : { code: ErrorCodes.MESSAGE_SEND_FAILED, message: 'Unknown provider error' },
    };
  }
}

export async function getNotification(id: string, productId: string): Promise<Notification> {
  const notification = await notificationRepo.findById(id);
  if (!notification || notification.product_id !== productId) {
    throw new AppError(ErrorCodes.NOTIFICATION_NOT_FOUND, `Notification ${id} not found`, 404);
  }
  return notification;
}

export async function getNotificationAttempts(
  notificationId: string,
  productId: string
): Promise<NotificationDeliveryAttempt[]> {
  await getNotification(notificationId, productId);
  return notificationRepo.findAttemptsByNotificationId(notificationId);
}

export async function listNotifications(
  productId: string,
  params: PaginationParams,
  filters?: {
    tenantId?: string;
    status?: NotificationStatus;
    event?: string;
    channel?: Channel;
    fromDate?: Date;
    toDate?: Date;
  }
): Promise<PaginatedResult<Notification>> {
  const { rows, total } = await notificationRepo.findByProductAndTenant(
    productId,
    filters?.tenantId,
    filters,
    params.limit,
    params.offset
  );
  return buildPaginatedResult(rows, total, params);
}

export async function updateDeliveryStatus(
  providerMessageId: string,
  status: NotificationStatus
): Promise<void> {
  await notificationRepo.updateStatusByProviderMessageId(providerMessageId, status);
}
