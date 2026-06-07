import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({
  fullname: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.registerUser(body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.loginUser(body.email, body.password);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function logout(_req: AuthRequest, res: Response) {
  res.json({ message: 'Logged out successfully' });
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user: req.user });
  } catch (e) {
    next(e);
  }
}
