import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as sponsorsService from '../services/sponsors.service';
import { AuthRequest } from '../middleware/auth';

const sponsorBaseSchema = z.object({
  episodeId: z.number().int().positive().optional(),
  episodeIds: z.array(z.number().int().positive()).min(1).optional(),
  name: z.string().min(1, 'Le nom du sponsor est requis'),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  websiteUrl: z.string().url().optional().nullable().or(z.literal('')),
  niche: z.string().optional().nullable(),
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
  contractType: z.enum([
    'per_episode', 'monthly', 'campaign', 'recurring', 'annual', 'affiliate', 'package',
  ]).optional(),
  trackingUrl: z.string().url().optional().or(z.literal('')),
  promoMessage: z.string().optional(),
  autoUpdateYoutube: z.boolean().optional(),
});

const sponsorCreateSchema = sponsorBaseSchema.refine(
  (data) => (data.episodeIds?.length ?? 0) > 0 || !!data.episodeId,
  { message: 'Au moins un épisode est requis', path: ['episodeIds'] },
);

const sponsorUpdateSchema = sponsorBaseSchema.partial().extend({
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
      contractStatus: req.query.contractStatus as never,
      contractType: req.query.contractType as never,
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
    const body = sponsorCreateSchema.parse(req.body);
    const episodeIds = body.episodeIds ?? (body.episodeId ? [body.episodeId] : undefined);
    const sponsor = await sponsorsService.createSponsor({
      ...body,
      episodeIds,
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
    const episodeIds = body.episodeIds ?? (body.episodeId ? [body.episodeId] : undefined);
    const sponsor = await sponsorsService.updateSponsor(Number(req.params.id), {
      ...body,
      episodeIds,
      email: body.email || undefined,
      logoUrl: body.logoUrl || null,
      websiteUrl: body.websiteUrl || null,
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
