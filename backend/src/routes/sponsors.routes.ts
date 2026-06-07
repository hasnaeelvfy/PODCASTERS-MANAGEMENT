import { Router } from 'express';
import * as sponsorsController from '../controllers/sponsors.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', sponsorsController.list);
router.post('/', sponsorsController.create);

export default router;
