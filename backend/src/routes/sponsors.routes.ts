import { Router } from 'express';
import * as sponsorsController from '../controllers/sponsors.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/stats', sponsorsController.stats);
router.get('/', sponsorsController.list);
router.get('/:id', sponsorsController.get);
router.post('/', sponsorsController.create);
router.put('/:id', sponsorsController.update);
router.delete('/:id', sponsorsController.remove);

export default router;
