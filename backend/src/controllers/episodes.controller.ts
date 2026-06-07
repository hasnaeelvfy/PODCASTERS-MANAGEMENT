import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as episodesService from '../services/episodes.service';
import { AuthRequest } from '../middleware/auth';

// URL validation regex
const urlRegex = /^https?:\/\/.+/;

const episodeSchema = z.object({
  guestId: z.number().int().positive(),
  episodeNumber: z.number().int().optional(),
  title: z.string().optional(),
  recordingDate: z.string().optional(),
  publicationDate: z.string().optional(),
  spotifyLink: z.string().optional(),
  youtubeLink: z.string().optional(),
  youtubeEpisodeUrl: z.string().regex(urlRegex, 'YouTube episode URL must be a valid URL starting with http:// or https://').optional(),
  spotifyEpisodeUrl: z.string().regex(urlRegex, 'Spotify episode URL must be a valid URL starting with http:// or https://').optional(),
  listens: z.number().int().min(0).optional(),
  views: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  completionRate: z.number().min(0).max(100).nullable().optional(),
});

const episodeUpdateSchema = episodeSchema.omit({ guestId: true }).partial();

export async function list(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const episodes = await episodesService.listEpisodes();
    res.json(episodes);
  } catch (e) {
    next(e);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = episodeSchema.parse(req.body);
    const episode = await episodesService.createEpisode(body);
    res.status(201).json(episode);
  } catch (e) {
    next(e);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = episodeUpdateSchema.parse(req.body);
    const episode = await episodesService.updateEpisode(Number(req.params.id), body);
    res.json(episode);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await episodesService.deleteEpisode(Number(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
