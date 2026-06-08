import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE } from '../utils/cookies';

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
    const { user, accessToken, refreshToken } = await authService.registerUser(body);
    setRefreshTokenCookie(res, refreshToken);
    res.status(201).json({ user, accessToken });
  } catch (e) {
    next(e);
  }
}

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.loginUser(body.email, body.password);
    setRefreshTokenCookie(res, refreshToken);
    res.json({ user, accessToken });
  } catch (e) {
    next(e);
  }
}

export async function refresh(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    const { accessToken, user } = await authService.refreshAccessToken(refreshToken);
    res.json({ accessToken, user });
  } catch (e) {
    next(e);
  }
}

export async function logout(_req: AuthRequest, res: Response) {
  clearRefreshTokenCookie(res);
  res.json({ message: 'Logged out successfully' });
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const body = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(
      req.user.userId,
      body.currentPassword,
      body.newPassword,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = await authService.getUserById(req.user.userId);
    res.json({ user });
  } catch (e) {
    next(e);
  }
}
