import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { config, validateConfig } from './config/env';
import { testConnection, closePool } from './db/pool';
import { logger } from './utils/logger';

async function start(): Promise<void> {
  validateConfig();

  await testConnection();
  logger.info('Database connection established');

  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`PingLayer running`, { port: config.port, env: config.env });
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await closePool();
      logger.info('Server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });
}

start().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});
