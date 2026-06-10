import { Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) throw new AppError(401, 'Authentication required');
    const result = await notificationService.listNotificationsForUser(req.user.userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) throw new AppError(401, 'Authentication required');
    const result = await notificationService.markNotificationRead(
      req.user.userId,
      Number(req.params.id),
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) throw new AppError(401, 'Authentication required');
    const result = await notificationService.markAllNotificationsRead(req.user.userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) throw new AppError(401, 'Authentication required');
    const result = await notificationService.deleteNotification(
      req.user.userId,
      Number(req.params.id),
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}
