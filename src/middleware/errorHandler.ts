import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, isAppError } from '../utils/errors';
import { ErrorCodes } from '../types';
import { logger } from '../utils/logger';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const requestId = (req as Request & { requestId?: string }).requestId;

  if (isAppError(err)) {
    if (err.statusCode >= 500) {
      logger.error('Operational error', { code: err.code, message: err.message, requestId });
    } else {
      logger.warn('Client error', { code: err.code, message: err.message, requestId });
    }

    const body: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      requestId,
    };

    if (err instanceof ValidationError && err.details) {
      body.error.details = err.details;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // Unhandled/unexpected errors
  logger.error('Unexpected error', {
    message: err.message,
    stack: err.stack,
    requestId,
  });

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An internal server error occurred',
    },
    requestId,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
