import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(cors());
  app.disable('x-powered-by');

  // ─── Request Parsing ─────────────────────────────────────────────────────────
  // Raw body for webhook signature verification
  app.use(
    '/webhooks',
    express.raw({ type: 'application/json' }),
    (req: express.Request & { rawBody?: Buffer }, _res, next) => {
      if (Buffer.isBuffer(req.body)) {
        req.rawBody = req.body;
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

  // ─── API Routes ──────────────────────────────────────────────────────────────
  app.use('/api/v1', v1Router);
  app.use('/admin/api', adminRouter);
  app.use('/webhooks', webhookRouter);

  // ─── Frontend Static Files & SPA Fallback ────────────────────────────────────
  const candidatePaths = [
    path.resolve(__dirname, '../public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(__dirname, '../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist'),
  ];
  const staticPath = candidatePaths.find((p) => fs.existsSync(p));

  if (staticPath) {
    logger.info('Serving frontend static files from', { path: staticPath });
    app.use(express.static(staticPath));

    // Handle SPA client-side routing for non-API routes
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api/') ||
        req.path === '/api' ||
        req.path.startsWith('/admin/api/') ||
        req.path === '/admin/api' ||
        req.path.startsWith('/webhooks/') ||
        req.path === '/webhooks' ||
        req.path === '/health'
      ) {
        return next();
      }
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  // ─── Error Handling ──────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
