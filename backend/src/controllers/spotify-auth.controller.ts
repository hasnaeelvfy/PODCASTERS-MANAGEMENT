import { Request, Response, NextFunction } from 'express';
import { oauthService } from '../services/oauth.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export async function connect(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!oauthService.isConfigured('spotify')) {
      return next(
        new AppError(503, 'OAuth Spotify non configuré. Ajoutez SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET dans .env'),
      );
    }

    const url = oauthService.getAuthorizationUrl('spotify', req.user!.userId);
    const wantsRedirect =
      req.query.redirect === '1' ||
      req.query.redirect === 'true' ||
      req.accepts('html') === 'html';

    if (wantsRedirect && !req.accepts('json')) {
      return res.redirect(url);
    }

    res.json({ authorizationUrl: url });
  } catch (e) {
    next(e);
  }
}

export async function callback(req: Request, res: Response) {
  const platform = 'spotify' as const;
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    const error = req.query.error as string | undefined;
    if (error) {
      return res.redirect(oauthService.getFrontendRedirect('error', platform, error));
    }

    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    if (!code || !state) {
      return res.redirect(oauthService.getFrontendRedirect('error', platform, 'missing_code'));
    }

    await oauthService.handleCallback(platform, code, state);
    return res.redirect(oauthService.getFrontendRedirect('success', platform));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'oauth_failed';
    return res.redirect(oauthService.getFrontendRedirect('error', platform, message));
  }
}
