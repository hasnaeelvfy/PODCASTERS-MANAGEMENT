import { Router } from 'express';
import * as guestsController from '../controllers/guests.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/stages', guestsController.listStages);
router.get('/', guestsController.list);
router.get('/:id', guestsController.getOne);
router.post('/', guestsController.create);
router.put('/:id', guestsController.update);
router.delete('/:id', guestsController.remove);
router.post('/:id/interactions', guestsController.addInteraction);

export default router;
