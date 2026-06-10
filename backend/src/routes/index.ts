import { Router } from 'express';
import authRoutes from './auth.routes';
import guestsRoutes from './guests.routes';
import episodesRoutes from './episodes.routes';
import shortsRoutes from './shorts.routes';
import sponsorsRoutes from './sponsors.routes';
import contractsRoutes from './contracts.routes';
import dashboardRoutes from './dashboard.routes';
import analyticsRoutes from './analytics.routes';
import youtubeRoutes from './youtube.routes';
import settingsRoutes from './settings.routes';
import usersRoutes from './users.routes';
import notificationsRoutes from './notifications.routes';
import tasksRoutes from './tasks.routes';
import activityRoutes from './activity.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/guests', guestsRoutes);
router.use('/episodes', episodesRoutes);
router.use('/shorts', shortsRoutes);
router.use('/sponsors', sponsorsRoutes);
router.use('/sponsor-contracts', contractsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/youtube', youtubeRoutes);
router.use('/settings', settingsRoutes);
router.use('/users', usersRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/activity', activityRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'prodcasters-api' });
});

export default router;
