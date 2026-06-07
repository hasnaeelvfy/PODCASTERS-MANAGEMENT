import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as guestsService from '../services/guests.service';
import { AuthRequest } from '../middleware/auth';

const guestSchema = z.object({
  firstName: z.string().optional().default(''),
  lastName: z.string().optional().default(''),
  company: z.string().optional(),
  sector: z.string().optional(),
  city: z.string().optional(),
  source: z.string().optional(),
  contact: z.string().optional(),
  language: z.enum(['mixte', 'francais', 'darija', 'adefini']).optional(),
  stageId: z.number().int().positive().optional(),
  shootingDate: z.string().nullable().optional(),
  whyElmaakoul: z.string().optional(),
  emotionalAngle: z.string().optional(),
  notes: z.string().optional(),
});

const interactionSchema = z.object({ note: z.string().min(1) });

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const stageId = req.query.stageId ? Number(req.query.stageId) : undefined;
    const search = req.query.search as string | undefined;
    const guests = await guestsService.listGuests({ stageId, search });
    res.json(guests);
  } catch (e) {
    next(e);
  }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const guest = await guestsService.getGuestById(Number(req.params.id));
    res.json(guest);
  } catch (e) {
    next(e);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = guestSchema.parse(req.body);
    if (!body.firstName && !body.lastName) {
      return res.status(400).json({ error: 'First name or last name required' });
    }
    const guest = await guestsService.createGuest(body);
    res.status(201).json(guest);
  } catch (e) {
    next(e);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = guestSchema.partial().parse(req.body);
    const guest = await guestsService.updateGuest(Number(req.params.id), body);
    res.json(guest);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await guestsService.deleteGuest(Number(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function addInteraction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { note } = interactionSchema.parse(req.body);
    const interaction = await guestsService.addInteraction(Number(req.params.id), note);
    res.status(201).json(interaction);
  } catch (e) {
    next(e);
  }
}

export async function listStages(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const stages = await guestsService.listPipelineStages();
    res.json(stages);
  } catch (e) {
    next(e);
  }
}
