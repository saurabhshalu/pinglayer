import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config/env';
import { handleMetaWebhook } from '../../webhooks/handlers/whatsapp/meta.webhook.handler';
import { logger } from '../../utils/logger';

const router = Router();

type WebhookRequest = Request & { rawBody?: Buffer };

function verifyMetaSignature(req: WebhookRequest): boolean {
  const appSecret = config.meta.appSecret;
  if (!appSecret) {
    logger.warn('META_APP_SECRET not configured — webhook signature verification skipped');
    return true;
  }

  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) {
    logger.warn('Meta webhook request missing X-Hub-Signature-256 header');
    return false;
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    logger.warn('Meta webhook raw body unavailable for signature verification');
    return false;
  }

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

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
router.post('/whatsapp/meta', (req: WebhookRequest, res: Response, next: NextFunction) => {
  if (!verifyMetaSignature(req)) {
    logger.warn('Meta webhook rejected — invalid signature');
    res.sendStatus(401);
    return;
  }

  // Acknowledge immediately per Meta requirements (respond within 5s)
  res.sendStatus(200);

  handleMetaWebhook(req.body).catch(err => {
    logger.error('Failed to process Meta webhook', { error: err.message });
  });
});

export default router;
