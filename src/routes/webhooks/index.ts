import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config/env';
import { handleMetaWebhook } from '../../webhooks/handlers/whatsapp/meta.webhook.handler';
import { logger } from '../../utils/logger';

const router = Router();

// ─── Meta/WhatsApp Webhook ────────────────────────────────────────────────────

// Webhook verification (GET) — Meta sends this to verify the endpoint
router.get('/whatsapp/meta', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
    logger.info('Meta webhook verified');
    res.status(200).send(challenge);
  } else {
    logger.warn('Meta webhook verification failed', { mode, tokenMatch: token === config.meta.webhookVerifyToken });
    res.sendStatus(403);
  }
});

// Webhook events (POST) — Meta sends status updates and incoming messages
router.post('/whatsapp/meta', (req: Request, res: Response, next: NextFunction) => {
  // Acknowledge immediately per Meta requirements (respond within 5s)
  res.sendStatus(200);

  handleMetaWebhook(req.body).catch(err => {
    logger.error('Failed to process Meta webhook', { error: err.message });
  });
});

export default router;
