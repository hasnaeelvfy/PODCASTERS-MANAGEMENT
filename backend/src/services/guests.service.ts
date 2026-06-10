import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { GuestLanguage } from '@prisma/client';
import { logActivity } from './activity.service';
import { broadcastNotification } from './notification.service';

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
      episode: {
        include: {
          shorts: true,
          sponsors: true,
          contractEpisodes: {
            where: { contract: { deletedAt: null } },
            include: {
              contract: {
                include: { sponsor: true },
              },
            },
          },
        },
      },
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
      episode: {
        include: {
          shorts: true,
          sponsors: true,
          contractEpisodes: {
            where: { contract: { deletedAt: null } },
            include: {
              contract: {
                include: { sponsor: true },
              },
            },
          },
        },
      },
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

  const name = `${guest.firstName} ${guest.lastName}`.trim();
  await logActivity(`Invité ajouté : ${name}`);

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
  const before = await getGuestById(id);
  const previousStageId = before.stageId;

  if (data.stageId !== undefined) {
    const stage = await prisma.pipelineStage.findUnique({ where: { id: data.stageId } });
    if (stage?.position === 6) {
      if (before.episode && !before.episode.publicationDate) {
        await prisma.episode.update({
          where: { id: before.episode.id },
          data: { publicationDate: new Date() },
        });
      }
    }
  }

  const updated = await prisma.guest.update({
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
      episode: {
        include: {
          shorts: true,
          sponsors: true,
          contractEpisodes: {
            where: { contract: { deletedAt: null } },
            include: {
              contract: {
                include: { sponsor: true },
              },
            },
          },
        },
      },
      interactions: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (data.stageId !== undefined && data.stageId !== previousStageId) {
    const stage = updated.stage;
    const name = `${updated.firstName} ${updated.lastName}`.trim();
    const stageLabel = stage?.name ?? 'mis à jour';

    await logActivity(`Invité ${stageLabel} : ${name}`);

    if (stage?.position === 4) {
      await broadcastNotification(
        'rappel_enregistrement',
        '🎙️ Enregistrement à planifier',
        `🎙️ Invité confirmé : ${name} — pensez à planifier l'enregistrement`,
        `/guests/${id}`,
      );
    }

    if (stage?.position === 6) {
      const ep = updated.episode;
      const epTitle = ep?.title || name;
      await broadcastNotification(
        'episode_publie',
        '✅ Épisode publié',
        `✅ Épisode publié : ${epTitle}`,
        `/guests/${id}`,
      );
      await logActivity(`Épisode publié : ${epTitle}`);
    }
  }

  return updated;
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
