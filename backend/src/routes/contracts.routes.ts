import { Router } from 'express';
import * as contractsController from '../controllers/contracts.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/dashboard-stats', contractsController.dashboardStats);
router.get('/youtube-logs', contractsController.listLogs);
router.post('/youtube-logs/:videoId/rollback', contractsController.rollback);
router.get('/episodes/:episodeId/active-sponsor', contractsController.activeForEpisode);

router.get('/', contractsController.list);
router.post('/', contractsController.create);
router.get('/:id', contractsController.get);
router.put('/:id', contractsController.update);
router.delete('/:id', contractsController.remove);

router.post('/:id/activate', contractsController.activate);
router.post('/:id/pause', contractsController.pause);
router.post('/:id/cancel', contractsController.cancel);
router.get('/:id/preview', contractsController.previewBlock);
router.get('/:id/episodes', contractsController.listEpisodes);
router.post('/:id/episodes', contractsController.addEpisodes);

export default router;
