import { Request, Response, NextFunction } from 'express';
import type { Platform } from '@prisma/client';
import { analyticsService } from '../services/analytics.service';
import { oauthService } from '../services/oauth.service';
import { syncPlatformStats } from '../services/platform-sync.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const PLATFORMS: Platform[] = ['youtube', 'spotify', 'tiktok', 'instagram'];

function parsePlatform(raw: string): Platform {
  if (!PLATFORMS.includes(raw as Platform)) {
    throw new AppError(400, `Invalid platform: ${raw}`);
  }
  return raw as Platform;
}

export const analyticsController = {
  async platforms(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getPlatformAnalytics();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async connections(_req: Request, res: Response, next: NextFunction) {
    try {
      const connections = await analyticsService.getConnections();
      res.json({ connections });
    } catch (err) {
      next(err);
    }
  },

  async connect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const platform = parsePlatform(req.params.platform);
      if (!oauthService.isConfigured(platform)) {
        return next(new AppError(503, `OAuth non configuré pour ${platform}. Ajoutez les clés API dans .env`));
      }
      const url = oauthService.getAuthorizationUrl(platform, req.user!.userId);
      res.json({ authorizationUrl: url });
    } catch (err) {
      next(err);
    }
  },

  async callback(req: Request, res: Response) {
    const platform = req.params.platform as Platform;
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      if (!PLATFORMS.includes(platform)) {
        return res.redirect(`${frontend}/integrations?status=error&platform=${platform}&message=invalid_platform`);
      }

      const error = req.query.error as string | undefined;
      if (error) {
        return res.redirect(
          oauthService.getFrontendRedirect('error', platform, error),
        );
      }

      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;
      if (!code || !state) {
        return res.redirect(
          oauthService.getFrontendRedirect('error', platform, 'missing_code'),
        );
      }

      await oauthService.handleCallback(platform, code, state);
      return res.redirect(oauthService.getFrontendRedirect('success', platform));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'oauth_failed';
      return res.redirect(oauthService.getFrontendRedirect('error', platform, message));
    }
  },

  async disconnect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const platform = parsePlatform(req.params.platform);
      await oauthService.disconnect(platform);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async syncNow(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await syncPlatformStats();
      const data = await analyticsService.getPlatformAnalytics();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};
