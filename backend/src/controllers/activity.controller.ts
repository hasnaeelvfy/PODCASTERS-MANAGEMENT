import { Response, NextFunction } from 'express';
import * as activityService from '../services/activity.service';
import { AuthRequest } from '../middleware/auth';

export async function list(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const activity = await activityService.listRecentActivity(10);
    res.json(activity);
  } catch (e) {
    next(e);
  }
}
