import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as episodesService from '../services/episodes.service';
import * as contractService from '../services/contract.service';
import { AuthRequest } from '../middleware/auth';

// URL validation regex
const urlRegex = /^https?:\/\/.+/;

const optionalUrl = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().regex(urlRegex, 'URL invalide (doit commencer par http:// ou https://)').optional(),
);

const episodeSchema = z.object({
  guestId: z.number().int().positive(),
  episodeNumber: z.number().int().min(0).optional(),
  title: z.string().optional(),
  recordingDate: z.string().optional(),
  publicationDate: z.string().optional(),
  spotifyLink: z.string().optional(),
  youtubeLink: z.string().optional(),
  youtubeEpisodeUrl: optionalUrl,
  spotifyEpisodeUrl: optionalUrl,
  listens: z.number().int().min(0, 'Les écoutes ne peuvent pas être négatives').optional(),
  views: z.number().int().min(0, 'Les vues ne peuvent pas être négatives').optional(),
  shares: z.number().int().min(0, 'Les partages ne peuvent pas être négatifs').optional(),
  completionRate: z
    .number()
    .min(0, 'La complétion doit être entre 0 et 100')
    .max(100, 'La complétion doit être entre 0 et 100')
    .nullable()
    .optional(),
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

export async function activeSponsor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const episodeId = Number(req.params.id);
    const date = req.query.date ? new Date(String(req.query.date)) : new Date();
    const contract = await contractService.getActiveContractForEpisode(episodeId, date);
    res.json({ contract });
  } catch (e) {
    next(e);
  }
}
