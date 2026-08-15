import { Request, Response, NextFunction } from 'express';
import { authenticateProductApiKey } from '../services/product.service';
import { UnauthorizedError } from '../utils/errors';
import { Product } from '../types';

export interface AuthenticatedRequest extends Request {
  product: Product;
  requestId?: string;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Authorization header with Bearer token required'));
    return;
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    next(new UnauthorizedError('API key is required'));
    return;
  }

  try {
    const product = await authenticateProductApiKey(rawKey);
    (req as AuthenticatedRequest).product = product;
    next();
  } catch (err) {
    next(err);
  }
}
