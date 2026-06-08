import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const roleSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
});

export async function updateRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(new AppError(401, 'Unauthorized'));

    const targetId = Number(req.params.id);
    const { role } = roleSchema.parse(req.body);

    if (req.user.userId === targetId && role !== 'admin') {
      return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre rôle' });
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, fullname: true, email: true, role: true },
    });

    res.json(user);
  } catch (e) {
    next(e);
  }
}
