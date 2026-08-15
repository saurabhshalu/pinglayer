import { ErrorCode, ErrorCodes } from '../types';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(code: ErrorCode, message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code: ErrorCode = ErrorCodes.UNAUTHORIZED) {
    super(code, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code: ErrorCode = ErrorCodes.FORBIDDEN) {
    super(code, message, 403);
  }
}

export class ValidationError extends AppError {
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(ErrorCodes.VALIDATION_ERROR, message, 422);
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 409);
  }
}

export class ProviderError extends AppError {
  public readonly providerCode?: string | number;
  public readonly providerResponse?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    providerCode?: string | number,
    providerResponse?: unknown
  ) {
    super(code, message, 502);
    this.providerCode = providerCode;
    this.providerResponse = providerResponse;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
