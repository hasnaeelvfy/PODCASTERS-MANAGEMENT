import { Router } from 'express';
import authRoutes from './auth.routes';
import guestsRoutes from './guests.routes';
import episodesRoutes from './episodes.routes';
import shortsRoutes from './shorts.routes';
import sponsorsRoutes from './sponsors.routes';
import dashboardRoutes from './dashboard.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/guests', guestsRoutes);
router.use('/episodes', episodesRoutes);
router.use('/shorts', shortsRoutes);
router.use('/sponsors', sponsorsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'prodcasters-api' });
});

export default router;
