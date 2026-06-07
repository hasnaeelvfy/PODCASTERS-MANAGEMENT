import { Router } from 'express';
import * as episodesController from '../controllers/episodes.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', episodesController.list);
router.post('/', episodesController.create);
router.put('/:id', episodesController.update);
router.delete('/:id', episodesController.remove);

export default router;
