import { Prisma, SponsorStatus, SponsorType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function listSponsors(episodeId?: number) {
  return prisma.sponsor.findMany({
    where: episodeId ? { episodeId } : undefined,
    include: { episode: { include: { guest: true } } },
    orderBy: { amount: 'desc' },
  });
}

export async function createSponsor(data: {
  episodeId: number;
  name: string;
  sponsorType?: SponsorType;
  amount?: number;
  status?: SponsorStatus;
  notes?: string;
}) {
  const episode = await prisma.episode.findUnique({ where: { id: data.episodeId } });
  if (!episode) throw new AppError(404, 'Episode not found');

  return prisma.sponsor.create({
    data: {
      episodeId: data.episodeId,
      name: data.name,
      sponsorType: data.sponsorType || 'mention',
      amount: new Prisma.Decimal(data.amount ?? 0),
      status: data.status || 'prospect',
      notes: data.notes,
    },
  });
}
