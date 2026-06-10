import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(authenticate);
router.get('/', settingsController.getAll);
router.put('/', requireRole('admin', 'editor'), settingsController.update);
router.post('/test-email', requireRole('admin', 'editor'), settingsController.testNotificationEmail);
router.get('/users', requireRole('admin'), settingsController.getUsers);

export default router;
