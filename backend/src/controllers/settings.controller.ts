import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as settingsService from '../services/settings.service';
import { sendTestNotificationEmail } from '../services/notification-email.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const settingsSchema = z.record(z.string().nullable());

export async function getAll(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await settingsService.getAllSettings());
  } catch (e) {
    next(e);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = settingsSchema.parse(req.body);
    const settings = await settingsService.updateSettings(body);
    res.json(settings);
  } catch (e) {
    next(e);
  }
}

export async function getUsers(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const users = await settingsService.getUsers();
    res.json(users);
  } catch (e) {
    next(e);
  }
}

export async function testNotificationEmail(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await sendTestNotificationEmail();
    if (!result.ok) throw new AppError(400, result.message);
    res.json(result);
  } catch (e) {
    next(e);
  }
}
