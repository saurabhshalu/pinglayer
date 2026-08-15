import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

import v1Router from './routes/api/v1/index';
import adminRouter from './routes/admin/index';
import webhookRouter from './routes/webhooks/index';

export function createApp(): express.Application {
  const app = express();

  // ─── Security ───────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors());
  app.disable('x-powered-by');

  // ─── Rate Limiting ───────────────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
      },
    })
  );

  // ─── Request Parsing ─────────────────────────────────────────────────────────
  // Raw body for webhook signature verification
  app.use(
    '/webhooks',
    express.raw({ type: 'application/json' }),
    (req, _res, next) => {
      if (Buffer.isBuffer(req.body)) {
        req.body = JSON.parse(req.body.toString());
      }
      next();
    }
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // ─── Request ID ──────────────────────────────────────────────────────────────
  app.use(requestIdMiddleware);

  // ─── Health ──────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'pinglayer', version: '1.0.0' });
  });

  // ─── Routes ──────────────────────────────────────────────────────────────────
  app.use('/api/v1', v1Router);
  app.use('/admin/api', adminRouter);
  app.use('/webhooks', webhookRouter);

  // ─── Error Handling ──────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
