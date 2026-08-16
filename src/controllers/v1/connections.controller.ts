import { Request, Response, NextFunction } from 'express';
import * as connectionService from '../../services/connection.service';
import {
  createConnectionSchema,
  updateConnectionSchema,
} from '../../validators/connection.validator';
import { validate } from '../../validators/product.validator';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { AuthenticatedRequest } from '../../middleware/auth';
import { Channel, ConnectionStatus } from '../../types';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const body = validate<Parameters<typeof connectionService.createConnection>[0]>(
      createConnectionSchema,
      req.body
    );
    const connection = await connectionService.createConnection({
      ...body,
      productId: product.id,
    });
    sendCreated(res, sanitizeConnection(connection));
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const params = parsePagination(req);
    const result = await connectionService.listProductConnections(product.id, params);
    sendPaginated(res, { ...result, data: result.data.map((c) => sanitizeConnection(c)) });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const connection = await connectionService.getConnection(req.params['id']!, product.id);
    sendSuccess(res, sanitizeConnection(connection));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const body = validate<{
      tenantName?: string;
      credentials?: Record<string, string>;
      config?: Record<string, unknown>;
      status?: ConnectionStatus;
    }>(updateConnectionSchema, req.body);

    const connection = await connectionService.updateConnection(req.params['id']!, product.id, body);
    sendSuccess(res, sanitizeConnection(connection));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    await connectionService.deleteConnection(req.params['id']!, product.id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

export async function validate_connection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const result = await connectionService.validateConnection(req.params['id']!, product.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function test(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const result = await connectionService.testConnection(req.params['id']!, product.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

function sanitizeConnection(connection: object): Record<string, unknown> {
  // Never expose credentials through API — credentials live in a separate table and are never fetched here
  return connection as Record<string, unknown>;
}
