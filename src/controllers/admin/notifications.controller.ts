import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../../services/notification.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { Channel, NotificationStatus } from '../../types';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = parsePagination(req);
    const productId = req.query['productId'] as string;
    if (!productId) {
      throw Object.assign(new Error('productId query param required'), {
        statusCode: 400, code: 'VALIDATION_ERROR', isOperational: true,
      });
    }

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

    const result = await notificationService.listNotifications(productId, params, filters);
    sendPaginated(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = req.query['productId'] as string;
    if (!productId) {
      throw Object.assign(new Error('productId query param required'), {
        statusCode: 400, code: 'VALIDATION_ERROR', isOperational: true,
      });
    }
    const notification = await notificationService.getNotification(req.params['id']!, productId);
    sendSuccess(res, notification);
  } catch (err) {
    next(err);
  }
}
