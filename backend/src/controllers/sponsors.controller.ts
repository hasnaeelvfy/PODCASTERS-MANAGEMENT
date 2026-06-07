import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as sponsorsService from '../services/sponsors.service';
import { AuthRequest } from '../middleware/auth';

const sponsorSchema = z.object({
  episodeId: z.number().int().positive(),
  name: z.string().min(1),
  sponsorType: z.enum(['preroll', 'midroll', 'postroll', 'mention', 'partenaire']).optional(),
  amount: z.number().min(0).optional(),
  status: z.enum(['prospect', 'nego', 'confirme', 'paye']).optional(),
  notes: z.string().optional(),
});

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const episodeId = req.query.episodeId ? Number(req.query.episodeId) : undefined;
    const sponsors = await sponsorsService.listSponsors(episodeId);
    res.json(sponsors);
  } catch (e) {
    next(e);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = sponsorSchema.parse(req.body);
    const sponsor = await sponsorsService.createSponsor(body);
    res.status(201).json(sponsor);
  } catch (e) {
    next(e);
  }
}
