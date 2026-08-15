import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

/**
 * Simple admin authentication using a shared secret.
 * Replace with proper identity provider (JWT/OAuth) in production.
 */
export function adminAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Admin authorization required'));
    return;
  }

  const token = authHeader.slice(7).trim();
  const expected = config.admin.authSecret;

  if (!expected) {
    next(new UnauthorizedError('Admin authentication not configured'));
    return;
  }

  // Constant-time compare
  try {
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expected);
    if (
      tokenBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(tokenBuf, expectedBuf)
    ) {
      next(new UnauthorizedError('Invalid admin credentials'));
      return;
    }
    next();
  } catch {
    next(new UnauthorizedError('Invalid admin credentials'));
  }
}
