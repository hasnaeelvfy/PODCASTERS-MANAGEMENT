import { Router } from 'express';
import * as spotifyController from '../controllers/spotify.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(authenticate);
router.get('/status', spotifyController.status);
router.post('/sync/:episodeId', spotifyController.syncEpisode);
router.post('/sync-on-save', spotifyController.syncOnSave);
router.post('/sync-all', requireRole('admin', 'editor'), spotifyController.syncAll);

export default router;
