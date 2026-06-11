import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as contractService from '../services/contract.service';
import * as youtubeSponsor from '../services/youtube-sponsor.service';
import { AuthRequest } from '../middleware/auth';

const contractSchema = z.object({
  sponsorId: z.number().int().positive(),
  contractType: z.enum([
    'per_episode', 'monthly', 'campaign', 'recurring', 'annual', 'affiliate', 'package',
  ]),
  crmStatus: z.enum([
    'prospect', 'contacte', 'nego', 'confirme', 'refuse', 'partenaire_recurrent',
  ]).optional(),
  contractStatus: z.enum(['draft', 'active', 'paused', 'expired', 'cancelled']).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  amount: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  commissionRate: z.number().min(0).max(100).optional().nullable(),
  promoMessage: z.string().optional().nullable(),
  trackingUrl: z.string().optional().nullable(),
  discountCode: z.string().optional().nullable(),
  youtubeDescriptionTemplate: z.string().optional().nullable(),
  autoUpdateYoutube: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  episodeIds: z.array(z.number().int().positive()).optional(),
  forceOverlap: z.boolean().optional(),
});

const contractUpdateSchema = contractSchema.partial();

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await contractService.listContracts({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      contractStatus: req.query.contractStatus as never,
      crmStatus: req.query.crmStatus as never,
      sponsorId: req.query.sponsorId ? Number(req.query.sponsorId) : undefined,
      contractType: req.query.contractType as never,
      expiringWithinDays: req.query.expiringWithinDays
        ? Number(req.query.expiringWithinDays)
        : undefined,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function dashboardStats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await contractService.getSponsorDashboardStats());
  } catch (e) {
    next(e);
  }
}

export async function get(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await contractService.getContractById(Number(req.params.id)));
  } catch (e) {
    next(e);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = contractSchema.parse(req.body);
    const contract = await contractService.createContract(body);
    res.status(201).json(contract);
  } catch (e) {
    next(e);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = contractUpdateSchema.parse(req.body);
    res.json(await contractService.updateContract(Number(req.params.id), body));
  } catch (e) {
    next(e);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await contractService.deleteContract(Number(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function activate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const forceOverlap = req.body?.forceOverlap === true;
    res.json(await contractService.activateContract(Number(req.params.id), forceOverlap));
  } catch (e) {
    next(e);
  }
}

export async function pause(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await contractService.pauseContract(Number(req.params.id)));
  } catch (e) {
    next(e);
  }
}

export async function cancel(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await contractService.cancelContract(Number(req.params.id)));
  } catch (e) {
    next(e);
  }
}

export async function listEpisodes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contract = await contractService.getContractById(Number(req.params.id));
    res.json(contract.episodes);
  } catch (e) {
    next(e);
  }
}

export async function addEpisodes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { episodeIds } = z.object({ episodeIds: z.array(z.number().int().positive()) }).parse(req.body);
    res.json(await contractService.addEpisodesToContract(Number(req.params.id), episodeIds));
  } catch (e) {
    next(e);
  }
}

export async function previewBlock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contract = await contractService.getContractById(Number(req.params.id));
    res.json({ block: youtubeSponsor.buildSponsorBlock(contract) });
  } catch (e) {
    next(e);
  }
}

export async function activeForEpisode(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const episodeId = Number(req.params.episodeId);
    const date = req.query.date ? new Date(String(req.query.date)) : new Date();
    const contract = await contractService.getActiveContractForEpisode(episodeId, date);
    res.json({ contract });
  } catch (e) {
    next(e);
  }
}

const checkConflictsSchema = z.object({
  episodeIds: z.array(z.number().int().positive()).min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  excludeContractId: z.number().int().positive().optional(),
  contractType: z.enum([
    'per_episode',
    'monthly',
    'campaign',
    'recurring',
    'annual',
    'affiliate',
    'package',
  ]).optional(),
});

export async function checkConflicts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = checkConflictsSchema.parse(req.body);
    const conflicts = await contractService.getEpisodeConflicts(
      body.episodeIds,
      new Date(body.startDate),
      body.endDate ? new Date(body.endDate) : null,
      body.excludeContractId,
      body.contractType,
    );
    res.json({ conflicts });
  } catch (e) {
    next(e);
  }
}

export async function listLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await contractService.listYoutubeLogs({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 30,
      youtubeVideoId: req.query.youtubeVideoId as string | undefined,
      success: req.query.success !== undefined ? req.query.success === 'true' : undefined,
    }));
  } catch (e) {
    next(e);
  }
}

export async function rollback(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await youtubeSponsor.rollbackVideoDescription(String(req.params.videoId));
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}
