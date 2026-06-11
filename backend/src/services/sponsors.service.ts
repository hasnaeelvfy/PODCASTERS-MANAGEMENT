import { ContractStatus, ContractType, Prisma, SponsorStatus, SponsorType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { logActivity } from './activity.service';
import { broadcastNotification } from './notification.service';
import { sendSponsorConfirmedEmail } from './notification-email.service';
import { activateContract, createContract, setContractEpisodes } from './contract.service';

export interface SponsorFilters {
  page?: number;
  limit?: number;
  status?: SponsorStatus;
  contractStatus?: ContractStatus;
  contractType?: ContractType;
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
  contracts: {
    where: { deletedAt: null },
    select: {
      id: true,
      contractType: true,
      contractStatus: true,
      startDate: true,
      endDate: true,
      promoMessage: true,
      trackingUrl: true,
      autoUpdateYoutube: true,
      episodes: { select: { episodeId: true } },
      _count: { select: { episodes: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

function mapSponsorStatusToCrm(status: SponsorStatus): 'prospect' | 'contacte' | 'nego' | 'confirme' | 'refuse' {
  if (status === 'partenaire_recurrent') return 'confirme';
  return status;
}

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
    ...((filters.contractStatus || filters.contractType) && {
      contracts: {
        some: {
          deletedAt: null,
          ...(filters.contractStatus && { contractStatus: filters.contractStatus }),
          ...(filters.contractType && { contractType: filters.contractType }),
        },
      },
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
  episodeId?: number;
  episodeIds?: number[];
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  sponsorType?: SponsorType;
  contractType?: ContractType;
  amount: number;
  status: SponsorStatus;
  notes?: string;
  startDate?: string;
  endDate?: string;
  isRecurring?: boolean;
  trackingUrl?: string;
  promoMessage?: string;
  autoUpdateYoutube?: boolean;
}) {
  const episodeIds = data.episodeIds?.length
    ? [...new Set(data.episodeIds)]
    : data.episodeId
      ? [data.episodeId]
      : [];
  if (episodeIds.length === 0) {
    throw new AppError(400, 'Au moins un épisode est requis');
  }

  const episodes = await prisma.episode.findMany({
    where: { id: { in: episodeIds } },
    select: { id: true },
  });
  if (episodes.length !== episodeIds.length) {
    throw new AppError(404, 'Un ou plusieurs épisodes introuvables');
  }

  const primaryEpisodeId = episodeIds[0];

  const sponsor = await prisma.sponsor.create({
    data: {
      episodeId: primaryEpisodeId,
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

  await logActivity(
    `Sponsor ${data.status} : ${sponsor.name} (${Number(sponsor.amount)} MAD)`,
  );

  const contractType: ContractType =
    data.contractType ||
    (data.isRecurring ? 'recurring' : 'per_episode');

  let contract;
  try {
    contract = await createContract({
      sponsorId: sponsor.id,
      contractType,
      episodeIds,
      amount: data.amount,
      startDate: data.startDate,
      endDate: data.endDate,
      crmStatus: mapSponsorStatusToCrm(data.status),
      contractStatus: 'draft',
      trackingUrl: data.trackingUrl,
      promoMessage: data.promoMessage,
      autoUpdateYoutube: data.autoUpdateYoutube ?? true,
      notes: data.notes,
    });

    if (data.status === 'confirme' || data.status === 'partenaire_recurrent') {
      await activateContract(contract.id);
    }
  } catch (err) {
    await prisma.sponsorContract.updateMany({
      where: { sponsorId: sponsor.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await prisma.sponsor.update({
      where: { id: sponsor.id },
      data: { deletedAt: new Date() },
    });
    throw err;
  }

  if (data.status === 'confirme') {
    const guestId = sponsor.episode?.guest?.id;
    const amount = Number(sponsor.amount);
    try {
      await broadcastNotification(
        'sponsor_relance',
        '💰 Sponsor confirmé',
        `💰 Sponsor confirmé : ${sponsor.name} — ${amount.toLocaleString('fr-FR')} MAD`,
        guestId ? `/guests/${guestId}` : '/sponsors',
      );
      await sendSponsorConfirmedEmail(sponsor.name, amount);
    } catch (err) {
      console.error('[Sponsors] Notification/email sponsor confirmé:', err);
    }
  }

  return getSponsorById(sponsor.id);
}

export async function updateSponsor(
  id: number,
  data: Partial<{
    episodeId: number;
    episodeIds: number[];
    name: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    niche: string | null;
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
  const before = await getSponsorById(id);
  const { episodeIds, ...sponsorData } = data;
  const updated = await prisma.sponsor.update({
    where: { id },
    data: {
      ...sponsorData,
      amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
      startDate: data.startDate === null ? null : data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate === null ? null : data.endDate ? new Date(data.endDate) : undefined,
    },
    include: sponsorInclude,
  });

  // Sync the modal's episode selection to the sponsor's primary contract so that
  // episode badges (and YouTube descriptions) follow what the user selected.
  if (episodeIds && episodeIds.length > 0) {
    const contracts = await prisma.sponsorContract.findMany({
      where: { sponsorId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, contractStatus: true },
    });
    const primary =
      contracts.find((c) => c.contractStatus === 'active') ?? contracts[0];
    if (primary) {
      await setContractEpisodes(primary.id, episodeIds);
    }
  }

  if (data.status && data.status !== before.status) {
    const amount = Number(updated.amount);
    const statusLabel = data.status;
    await logActivity(`Sponsor ${statusLabel} : ${updated.name} (${amount} MAD)`);

    if (data.status === 'confirme') {
      const guestId = updated.episode?.guest?.id;
      try {
        await broadcastNotification(
          'sponsor_relance',
          '💰 Sponsor confirmé',
          `💰 Sponsor confirmé : ${updated.name} — ${amount.toLocaleString('fr-FR')} MAD`,
          guestId ? `/guests/${guestId}` : '/sponsors',
        );
        await sendSponsorConfirmedEmail(updated.name, amount);
      } catch (err) {
        console.error('[Sponsors] Notification/email sponsor confirmé:', err);
      }
    }
  }

  return updated;
}

export async function deleteSponsor(id: number) {
  await getSponsorById(id);
  const now = new Date();
  await prisma.sponsorContract.updateMany({
    where: { sponsorId: id, deletedAt: null },
    data: { deletedAt: now },
  });
  return prisma.sponsor.update({
    where: { id },
    data: { deletedAt: now },
  });
}

export async function getSponsorStats() {
  const sponsors = await prisma.sponsor.findMany({
    where: { deletedAt: null },
    include: {
      contracts: { where: { deletedAt: null } },
    },
  });

  const confirmedCrm = new Set(['confirme', 'partenaire_recurrent']);
  const activeSponsorIds = new Set<number>();
  let totalConfirmedRevenue = 0;
  let inNegotiationAmount = 0;
  const sponsorRevenue = new Map<number, { name: string; amount: number }>();

  for (const sponsor of sponsors) {
    if (sponsor.contracts.length > 0) {
      for (const contract of sponsor.contracts) {
        const amount = Number(contract.amount);
        if (contract.contractStatus === 'active' && confirmedCrm.has(contract.crmStatus)) {
          totalConfirmedRevenue += amount;
          sponsorRevenue.set(sponsor.id, {
            name: sponsor.name,
            amount: (sponsorRevenue.get(sponsor.id)?.amount ?? 0) + amount,
          });
        }
        if (
          contract.crmStatus === 'nego' &&
          !['cancelled', 'expired'].includes(contract.contractStatus)
        ) {
          inNegotiationAmount += amount;
        }
        if (contract.contractStatus === 'active') {
          activeSponsorIds.add(sponsor.id);
        }
      }
      continue;
    }

    const amount = Number(sponsor.amount);
    if (sponsor.status === 'confirme' || sponsor.status === 'partenaire_recurrent') {
      totalConfirmedRevenue += amount;
      sponsorRevenue.set(sponsor.id, { name: sponsor.name, amount });
    }
    if (sponsor.status === 'nego') {
      inNegotiationAmount += amount;
    }
    if (['confirme', 'nego', 'partenaire_recurrent', 'contacte'].includes(sponsor.status)) {
      activeSponsorIds.add(sponsor.id);
    }
  }

  const byStatus: Record<string, number> = {};
  for (const s of sponsors) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  }

  const topEntry = [...sponsorRevenue.entries()].sort((a, b) => b[1].amount - a[1].amount)[0];

  return {
    totalConfirmedRevenue,
    activeSponsors: activeSponsorIds.size,
    inNegotiationAmount,
    totalSponsors: sponsors.length,
    byStatus,
    topSponsor: topEntry
      ? { id: topEntry[0], name: topEntry[1].name, amount: topEntry[1].amount }
      : null,
  };
}
