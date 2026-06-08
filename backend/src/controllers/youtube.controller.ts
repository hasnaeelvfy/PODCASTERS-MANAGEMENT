import { Response, NextFunction } from 'express';
import * as youtubeService from '../services/youtube-data.service';
import { AuthRequest } from '../middleware/auth';

export async function test(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await youtubeService.testYoutubeConnection();
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function syncEpisode(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await youtubeService.syncEpisodeYoutubeStats(Number(req.params.episodeId));
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function syncAll(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await youtubeService.syncAllEpisodeStats();
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function syncOnSave(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { youtubeUrl, episodeId } = req.body as { youtubeUrl: string; episodeId: number };
    if (!youtubeUrl || !episodeId) {
      return res.status(400).json({ error: 'youtubeUrl et episodeId requis' });
    }
    const result = await youtubeService.syncOnSave(youtubeUrl, Number(episodeId));
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const stats = await youtubeService.getEpisodeYoutubeStats(Number(req.params.episodeId));
    res.json(stats);
  } catch (e) {
    next(e);
  }
}
