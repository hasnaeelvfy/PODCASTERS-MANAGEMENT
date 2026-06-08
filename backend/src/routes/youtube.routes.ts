import { Router } from 'express';
import * as youtubeController from '../controllers/youtube.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(authenticate);
router.get('/test', youtubeController.test);
router.get('/stats/:episodeId', youtubeController.getStats);
router.post('/sync-on-save', requireRole('admin', 'editor'), youtubeController.syncOnSave);
router.post('/sync/:episodeId', youtubeController.syncEpisode);
router.post('/sync-all', requireRole('admin', 'editor'), youtubeController.syncAll);

export default router;
