import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as sponsorsService from '../services/sponsors.service';
import { AuthRequest } from '../middleware/auth';

const sponsorSchema = z.object({
  episodeId: z.number().int().positive(),
  name: z.string().min(1, 'Le nom du sponsor est requis'),
  contactName: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  sponsorType: z.enum(['preroll', 'midroll', 'postroll', 'mention', 'partenaire']).optional(),
  amount: z.number().min(0, 'Le montant doit être positif'),
  status: z.enum(['prospect', 'contacte', 'nego', 'confirme', 'refuse', 'partenaire_recurrent']),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isRecurring: z.boolean().optional(),
});

const sponsorUpdateSchema = sponsorSchema.partial().extend({
  episodeId: z.number().int().positive().optional(),
});

export async function stats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await sponsorsService.getSponsorStats());
  } catch (e) {
    next(e);
  }
}

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await sponsorsService.listSponsors({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      status: req.query.status as never,
      episodeId: req.query.episodeId ? Number(req.query.episodeId) : undefined,
      search: req.query.search as string | undefined,
      minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
      maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function get(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sponsor = await sponsorsService.getSponsorById(Number(req.params.id));
    res.json(sponsor);
  } catch (e) {
    next(e);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = sponsorSchema.parse(req.body);
    const sponsor = await sponsorsService.createSponsor({
      ...body,
      email: body.email || undefined,
    });
    res.status(201).json(sponsor);
  } catch (e) {
    next(e);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = sponsorUpdateSchema.parse(req.body);
    const sponsor = await sponsorsService.updateSponsor(Number(req.params.id), {
      ...body,
      email: body.email || undefined,
    });
    res.json(sponsor);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await sponsorsService.deleteSponsor(Number(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
