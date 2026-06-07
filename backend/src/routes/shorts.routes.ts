import { Router } from 'express';
import * as shortsController from '../controllers/shorts.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', shortsController.list);
router.post('/', shortsController.create);

export default router;
