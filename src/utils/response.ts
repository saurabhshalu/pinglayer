import { Response } from 'express';
import { PaginatedResult } from '../types';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export function sendPaginated<T>(res: Response, result: PaginatedResult<T>): void {
  res.status(200).json({ success: true, ...result });
}

export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
