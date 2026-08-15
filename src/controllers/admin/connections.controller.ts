import { Request, Response, NextFunction } from 'express';
import * as connectionService from '../../services/connection.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { Channel, ConnectionStatus } from '../../types';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = parsePagination(req);
    const filters: {
      productId?: string;
      tenantId?: string;
      channel?: Channel;
      status?: ConnectionStatus;
    } = {};

    if (req.query['productId']) filters.productId = req.query['productId'] as string;
    if (req.query['tenantId']) filters.tenantId = req.query['tenantId'] as string;
    if (req.query['channel']) filters.channel = req.query['channel'] as Channel;
    if (req.query['status']) filters.status = req.query['status'] as ConnectionStatus;

    const result = await connectionService.listAllConnections(filters, params);
    sendPaginated(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Admin can view any connection — pass '*' sentinel and bypass ownership check
    const conn = await connectionService.getConnection(req.params['id']!, req.params['productId'] as string ?? '');
    sendSuccess(res, conn);
  } catch (err) {
    next(err);
  }
}

export async function validate_connection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = req.query['productId'] as string;
    if (!productId) throw Object.assign(new Error('productId query param required'), { statusCode: 400, code: 'VALIDATION_ERROR', isOperational: true });
    const result = await connectionService.validateConnection(req.params['id']!, productId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
