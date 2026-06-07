import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as shortsService from '../services/shorts.service';
import { AuthRequest } from '../middleware/auth';

// URL validation regex
const urlRegex = /^https?:\/\/.+/;

const shortSchema = z.object({
  episodeId: z.number().int().positive('Episode ID must be a positive integer'),
  platform: z.enum(['youtube_shorts', 'instagram_reels', 'tiktok', 'linkedin', 'facebook'], {
    errorMap: () => ({ message: 'Invalid platform. Must be one of: youtube_shorts, instagram_reels, tiktok, linkedin, facebook' })
  }),
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  views: z.number().int().min(0, 'Views must be a non-negative integer').default(0),
  likes: z.number().int().min(0, 'Likes must be a non-negative integer').default(0),
  shares: z.number().int().min(0, 'Shares must be a non-negative integer').default(0),
  url: z.string().min(1, 'URL is required').regex(urlRegex, 'URL must be a valid URL starting with http:// or https://'),
  description: z.string().min(1, 'Description is required').min(1, 'Description cannot be empty'),
  publishedAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

const shortUpdateSchema = shortSchema.partial().extend({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters').optional(),
  url: z.string().min(1, 'URL is required').regex(urlRegex, 'URL must be a valid URL starting with http:// or https://').optional(),
  description: z.string().min(1, 'Description is required').min(1, 'Description cannot be empty').optional(),
});

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const episodeId = req.query.episodeId ? Number(req.query.episodeId) : undefined;
    const shorts = await shortsService.listShorts(episodeId);
    res.json(shorts);
  } catch (e) {
    next(e);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = shortSchema.parse(req.body);
    const short = await shortsService.createShort(body);
    res.status(201).json(short);
  } catch (e) {
    next(e);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = shortUpdateSchema.parse(req.body);
    const short = await shortsService.updateShort(Number(req.params.id), body);
    res.json(short);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await shortsService.deleteShort(Number(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
