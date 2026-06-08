import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { GuestLanguage } from '@prisma/client';

const STAGE_KEY_MAP: Record<string, number> = {
  idee: 1,
  contacte: 2,
  discussion: 3,
  confirme: 4,
  enregistre: 5,
  publie: 6,
};

export function stageIdFromKey(key?: string): number {
  if (key && STAGE_KEY_MAP[key]) return STAGE_KEY_MAP[key];
  return 1;
}

export async function listGuests(filters?: { stageId?: number; search?: string }) {
  return prisma.guest.findMany({
    where: {
      ...(filters?.stageId ? { stageId: filters.stageId } : {}),
      ...(filters?.search
        ? {
            OR: [
              { firstName: { contains: filters.search } },
              { lastName: { contains: filters.search } },
              { company: { contains: filters.search } },
            ],
          }
        : {}),
    },
    include: {
      stage: true,
      episode: { include: { shorts: true, sponsors: true } },
      interactions: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { interactions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getGuestById(id: number) {
  const guest = await prisma.guest.findUnique({
    where: { id },
    include: {
      stage: true,
      interactions: { orderBy: { createdAt: 'desc' } },
      episode: { include: { shorts: true, sponsors: true } },
      tasks: true,
    },
  });
  if (!guest) throw new AppError(404, 'Guest not found');
  return guest;
}

export async function createGuest(data: {
  firstName: string;
  lastName: string;
  company?: string;
  sector?: string;
  city?: string;
  source?: string;
  contact?: string;
  language?: GuestLanguage;
  stageId?: number;
  shootingDate?: string | null;
  whyElmaakoul?: string;
  emotionalAngle?: string;
  notes?: string;
}) {
  const guest = await prisma.guest.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company,
      sector: data.sector,
      city: data.city,
      source: data.source,
      contact: data.contact,
      language: data.language || 'adefini',
      stageId: data.stageId || 1,
      shootingDate: data.shootingDate ? new Date(data.shootingDate) : null,
      whyElmaakoul: data.whyElmaakoul,
      emotionalAngle: data.emotionalAngle,
      notes: data.notes,
      episode: { create: {} },
    },
    include: { stage: true, episode: true },
  });
  return guest;
}

export async function updateGuest(
  id: number,
  data: Partial<{
    firstName: string;
    lastName: string;
    company: string;
    sector: string;
    city: string;
    source: string;
    contact: string;
    language: GuestLanguage;
    stageId: number;
    shootingDate: string | null;
    whyElmaakoul: string;
    emotionalAngle: string;
    notes: string;
  }>,
) {
  await getGuestById(id);

  if (data.stageId !== undefined) {
    const stage = await prisma.pipelineStage.findUnique({ where: { id: data.stageId } });
    if (stage?.position === 6) {
      const existing = await prisma.guest.findUnique({
        where: { id },
        include: { episode: true },
      });
      if (existing?.episode && !existing.episode.publicationDate) {
        await prisma.episode.update({
          where: { id: existing.episode.id },
          data: { publicationDate: new Date() },
        });
      }
    }
  }

  return prisma.guest.update({
    where: { id },
    data: {
      ...data,
      shootingDate:
        data.shootingDate === null
          ? null
          : data.shootingDate
            ? new Date(data.shootingDate)
            : undefined,
    },
    include: {
      stage: true,
      episode: { include: { shorts: true, sponsors: true } },
      interactions: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function deleteGuest(id: number) {
  await getGuestById(id);
  await prisma.guest.delete({ where: { id } });
}

export async function addInteraction(guestId: number, note: string) {
  await getGuestById(guestId);
  return prisma.interaction.create({
    data: { guestId, note },
  });
}

export async function listPipelineStages() {
  return prisma.pipelineStage.findMany({ orderBy: { position: 'asc' } });
}
