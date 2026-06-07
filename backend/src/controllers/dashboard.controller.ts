import { Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { AuthRequest } from '../middleware/auth';

export async function stats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getDashboardStats();
    res.json(data);
  } catch (e) {
    next(e);
  }
}
