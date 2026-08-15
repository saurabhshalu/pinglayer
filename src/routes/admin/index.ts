import { Router } from 'express';
import { adminAuthenticate } from '../../middleware/adminAuth';
import * as productsController from '../../controllers/admin/products.controller';
import * as connectionsController from '../../controllers/admin/connections.controller';
import * as notificationsController from '../../controllers/admin/notifications.controller';

const router = Router();

router.use(adminAuthenticate);

// ─── Products ─────────────────────────────────────────────────────────────────
router.post('/products', productsController.create);
router.get('/products', productsController.list);
router.get('/products/:id', productsController.getById);
router.put('/products/:id', productsController.update);

// API Keys
router.post('/products/:id/api-keys', productsController.generateApiKey);
router.get('/products/:id/api-keys', productsController.listApiKeys);
router.post('/products/:id/api-keys/:keyId/rotate', productsController.rotateApiKey);
router.delete('/products/:id/api-keys/:keyId', productsController.revokeApiKey);

// ─── Connections ──────────────────────────────────────────────────────────────
router.get('/connections', connectionsController.list);
router.get('/connections/:id', connectionsController.getById);
router.post('/connections/:id/validate', connectionsController.validate_connection);

// ─── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications', notificationsController.list);
router.get('/notifications/:id', notificationsController.getById);

export default router;
