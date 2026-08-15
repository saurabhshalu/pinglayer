import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import * as notificationsController from '../../../controllers/v1/notifications.controller';
import * as connectionsController from '../../../controllers/v1/connections.controller';
import * as templatesController from '../../../controllers/v1/templates.controller';

const router = Router();

// All v1 routes require product API key authentication
router.use(authenticate);

// ─── Notifications ────────────────────────────────────────────────────────────
router.post('/notifications/send', notificationsController.send);
router.get('/notifications', notificationsController.list);
router.get('/notifications/:id', notificationsController.getById);
router.get('/notifications/:id/attempts', notificationsController.getAttempts);

// ─── Connections ──────────────────────────────────────────────────────────────
router.post('/connections', connectionsController.create);
router.get('/connections', connectionsController.list);
router.get('/connections/:id', connectionsController.getById);
router.put('/connections/:id', connectionsController.update);
router.delete('/connections/:id', connectionsController.remove);
router.post('/connections/:id/validate', connectionsController.validate_connection);
router.post('/connections/:id/test', connectionsController.test);

// ─── Notification Definitions ─────────────────────────────────────────────────
router.post('/definitions', templatesController.createDefinition);
router.get('/definitions', templatesController.listDefinitions);
router.get('/definitions/:id', templatesController.getDefinition);
router.put('/definitions/:id', templatesController.updateDefinition);
router.delete('/definitions/:id', templatesController.deleteDefinition);

// Mappings (nested under definitions for context)
router.get('/definitions/:definitionId/mappings', templatesController.listMappings);

// ─── Template Mappings ────────────────────────────────────────────────────────
router.post('/mappings', templatesController.createMapping);
router.get('/mappings/:id', templatesController.getMapping);
router.put('/mappings/:id', templatesController.updateMapping);
router.delete('/mappings/:id', templatesController.deleteMapping);

export default router;
