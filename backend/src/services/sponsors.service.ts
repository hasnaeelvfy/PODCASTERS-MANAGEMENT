import { Prisma, SponsorStatus, SponsorType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export interface SponsorFilters {
  page?: number;
  limit?: number;
  status?: SponsorStatus;
  episodeId?: number;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
}

const sponsorInclude = {
  episode: {
    include: {
      guest: { select: { id: true, firstName: true, lastName: true, company: true } },
    },
  },
} as const;

export async function listSponsors(filters: SponsorFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const where: Prisma.SponsorWhereInput = {
    deletedAt: null,
    ...(filters.status && { status: filters.status }),
    ...(filters.episodeId && { episodeId: filters.episodeId }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search } },
        { contactName: { contains: filters.search } },
        { email: { contains: filters.search } },
      ],
    }),
    ...((filters.minAmount !== undefined || filters.maxAmount !== undefined) && {
      amount: {
        ...(filters.minAmount !== undefined && { gte: filters.minAmount }),
        ...(filters.maxAmount !== undefined && { lte: filters.maxAmount }),
      },
    }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.sponsor.findMany({
      where,
      include: sponsorInclude,
      orderBy: { amount: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sponsor.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
}

export async function getSponsorById(id: number) {
  const sponsor = await prisma.sponsor.findFirst({
    where: { id, deletedAt: null },
    include: sponsorInclude,
  });
  if (!sponsor) throw new AppError(404, 'Sponsor not found');
  return sponsor;
}

export async function createSponsor(data: {
  episodeId: number;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  sponsorType?: SponsorType;
  amount: number;
  status: SponsorStatus;
  notes?: string;
  startDate?: string;
  endDate?: string;
  isRecurring?: boolean;
}) {
  const episode = await prisma.episode.findUnique({ where: { id: data.episodeId } });
  if (!episode) throw new AppError(404, 'Episode not found');

  return prisma.sponsor.create({
    data: {
      episodeId: data.episodeId,
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      sponsorType: data.sponsorType || 'mention',
      amount: new Prisma.Decimal(data.amount),
      status: data.status,
      notes: data.notes,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      isRecurring: data.isRecurring ?? false,
    },
    include: sponsorInclude,
  });
}

export async function updateSponsor(
  id: number,
  data: Partial<{
    episodeId: number;
    name: string;
    contactName: string;
    email: string;
    phone: string;
    sponsorType: SponsorType;
    amount: number;
    status: SponsorStatus;
    notes: string;
    startDate: string | null;
    endDate: string | null;
    isRecurring: boolean;
  }>,
) {
  await getSponsorById(id);
  return prisma.sponsor.update({
    where: { id },
    data: {
      ...data,
      amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
      startDate: data.startDate === null ? null : data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate === null ? null : data.endDate ? new Date(data.endDate) : undefined,
    },
    include: sponsorInclude,
  });
}

export async function deleteSponsor(id: number) {
  await getSponsorById(id);
  return prisma.sponsor.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getSponsorStats() {
  const sponsors = await prisma.sponsor.findMany({ where: { deletedAt: null } });

  const confirmed = sponsors.filter((s) => s.status === 'confirme' || s.status === 'partenaire_recurrent');
  const active = sponsors.filter((s) => ['confirme', 'nego', 'partenaire_recurrent', 'contacte'].includes(s.status));
  const inNegotiation = sponsors.filter((s) => s.status === 'nego');

  const totalConfirmedRevenue = confirmed.reduce((sum, s) => sum + Number(s.amount), 0);
  const inNegotiationAmount = inNegotiation.reduce((sum, s) => sum + Number(s.amount), 0);

  const byStatus: Record<string, number> = {};
  for (const s of sponsors) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  }

  const topSponsor = [...sponsors].sort((a, b) => Number(b.amount) - Number(a.amount))[0];

  return {
    totalConfirmedRevenue,
    activeSponsors: active.length,
    inNegotiationAmount,
    totalSponsors: sponsors.length,
    byStatus,
    topSponsor: topSponsor
      ? { id: topSponsor.id, name: topSponsor.name, amount: Number(topSponsor.amount) }
      : null,
  };
}
