import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../../services/notification.service';
import { sendNotificationSchema, listNotificationsSchema } from '../../validators/notification.validator';
import { validate } from '../../validators/product.validator';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { AuthenticatedRequest } from '../../middleware/auth';
import { Channel, NotificationStatus } from '../../types';

export async function send(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const body = validate<{
      tenantId: string;
      event: string;
      recipient: { phone: string };
      data: Record<string, unknown>;
      channel?: Channel;
    }>(sendNotificationSchema, req.body);

    const result = await notificationService.sendNotification({
      productId: product.id,
      tenantId: body.tenantId,
      event: body.event.toUpperCase(),
      recipient: body.recipient.phone,
      data: body.data,
      channel: body.channel,
    });

    const statusCode = result.status === 'sent' ? 200 : 202;
    res.status(statusCode).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const params = parsePagination(req);

    const filters: {
      tenantId?: string;
      status?: NotificationStatus;
      event?: string;
      channel?: Channel;
      fromDate?: Date;
      toDate?: Date;
    } = {};

    if (req.query['tenantId']) filters.tenantId = req.query['tenantId'] as string;
    if (req.query['status']) filters.status = req.query['status'] as NotificationStatus;
    if (req.query['event']) filters.event = (req.query['event'] as string).toUpperCase();
    if (req.query['channel']) filters.channel = req.query['channel'] as Channel;
    if (req.query['fromDate']) filters.fromDate = new Date(req.query['fromDate'] as string);
    if (req.query['toDate']) filters.toDate = new Date(req.query['toDate'] as string);

    const result = await notificationService.listNotifications(product.id, params, filters);
    sendPaginated(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const notification = await notificationService.getNotification(req.params['id']!, product.id);
    sendSuccess(res, notification);
  } catch (err) {
    next(err);
  }
}

export async function getAttempts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const attempts = await notificationService.getNotificationAttempts(req.params['id']!, product.id);
    sendSuccess(res, attempts);
  } catch (err) {
    next(err);
  }
}
