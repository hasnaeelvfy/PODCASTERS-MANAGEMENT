import { Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import * as spotifyService from '../services/spotify-data.service';
import { recordSyncResult } from '../services/platform-token.service';

export async function status(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await spotifyService.getSpotifyStatus();
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function syncEpisode(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const spotifyEpisodeUrl = (req.body as { spotifyEpisodeUrl?: string } | undefined)
      ?.spotifyEpisodeUrl;
    const result = await spotifyService.syncEpisodeSpotifyStats(Number(req.params.episodeId), {
      spotifyEpisodeUrl,
    });
    await recordSyncResult('spotify', true);
    res.json(result);
  } catch (e) {
    if (e instanceof AppError && (e.statusCode === 503 || e.statusCode === 401)) {
      return res.status(503).json({
        success: false,
        manualFallback: true,
        error: e.message,
        message: e.message,
      });
    }
    if (e instanceof AppError && e.statusCode === 401) {
      return res.status(401).json({
        success: false,
        manualFallback: true,
        error: e.message,
        message: e.message,
      });
    }
    next(e);
  }
}

export async function syncOnSave(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { spotifyUrl, episodeId } = req.body as { spotifyUrl: string; episodeId: number };
    if (!spotifyUrl || !episodeId) {
      return next(new AppError(400, 'spotifyUrl et episodeId requis'));
    }
    const result = await spotifyService.syncOnSave(spotifyUrl, Number(episodeId));
    res.json(result);
  } catch (e) {
    if (e instanceof AppError && (e.statusCode === 503 || e.statusCode === 401)) {
      return res.status(e.statusCode).json({
        success: false,
        manualFallback: true,
        error: e.message,
        message: e.message,
      });
    }
    next(e);
  }
}

export async function syncAll(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await spotifyService.syncAllSpotifyStats();
    const failed = result.failed > 0;
    await recordSyncResult('spotify', !failed && !result.skipped, failed ? 'Certaines syncs ont échoué' : undefined);
    res.json(result);
  } catch (e) {
    next(e);
  }
}
