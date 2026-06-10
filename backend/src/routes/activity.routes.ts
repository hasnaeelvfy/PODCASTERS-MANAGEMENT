import { Router } from 'express';
import * as activityController from '../controllers/activity.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', activityController.list);

export default router;
