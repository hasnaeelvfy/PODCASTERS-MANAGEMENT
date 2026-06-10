import { Response, NextFunction } from 'express';
import * as tasksService from '../services/tasks.service';
import { AuthRequest } from '../middleware/auth';

export async function list(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tasks = await tasksService.listOpenTasks(5);
    res.json(tasks);
  } catch (e) {
    next(e);
  }
}

export async function markDone(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.markTaskDone(Number(req.params.id));
    res.json(task);
  } catch (e) {
    next(e);
  }
}
