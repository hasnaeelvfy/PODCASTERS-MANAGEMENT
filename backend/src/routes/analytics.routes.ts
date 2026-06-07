import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { analyticsController } from '../controllers/analytics.controller';

const router = Router();

router.get('/platforms', authenticate, analyticsController.platforms);
router.get('/connections', authenticate, analyticsController.connections);

router.post('/sync', authenticate, requireRole('admin', 'editor'), analyticsController.syncNow);

router.get(
  '/oauth/:platform/connect',
  authenticate,
  requireRole('admin', 'editor'),
  analyticsController.connect,
);

router.get('/oauth/:platform/callback', analyticsController.callback);

router.delete(
  '/connections/:platform',
  authenticate,
  requireRole('admin', 'editor'),
  analyticsController.disconnect,
);

export default router;
