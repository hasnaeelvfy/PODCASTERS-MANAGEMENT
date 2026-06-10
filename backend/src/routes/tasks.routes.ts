import { Router } from 'express';
import * as tasksController from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(authenticate);
router.get('/', tasksController.list);
router.patch('/:id', requireRole('admin', 'editor'), tasksController.markDone);

export default router;
