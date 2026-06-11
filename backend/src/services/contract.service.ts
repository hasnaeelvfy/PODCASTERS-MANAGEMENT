import {
  ContractStatus,
  ContractType,
  ContractCrmStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import * as youtubeSponsor from './youtube-sponsor.service';

const contractInclude = {
  sponsor: true,
  episodes: {
    include: {
      episode: {
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, company: true } },
        },
      },
    },
  },
} satisfies Prisma.SponsorContractInclude;

export type ContractWithRelations = Prisma.SponsorContractGetPayload<{
  include: typeof contractInclude;
}>;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Paid spot types that block each other on the same episode + period. */
const PAID_SPOT_CONTRACT_TYPES: ContractType[] = [
  'per_episode',
  'monthly',
  'campaign',
  'annual',
  'package',
  'recurring',
];

function isPaidSpotContractType(contractType?: ContractType | null): boolean {
  return Boolean(contractType && PAID_SPOT_CONTRACT_TYPES.includes(contractType));
}

function isContractActiveOnDate(
  contract: { contractStatus: ContractStatus; startDate: Date | null; endDate: Date | null },
  date: Date,
): boolean {
  if (contract.contractStatus !== 'active') return false;
  const day = startOfDay(date);
  if (contract.startDate && startOfDay(contract.startDate) > day) return false;
  if (contract.endDate && startOfDay(contract.endDate) < day) return false;
  return true;
}

export async function getActiveContractForEpisode(
  episodeId: number,
  date: Date = new Date(),
): Promise<ContractWithRelations | null> {
  const links = await prisma.contractEpisode.findMany({
    where: { episodeId },
    include: {
      contract: {
        include: contractInclude,
      },
    },
  });

  const active = links
    .map((l) => l.contract)
    .filter((c) => c.deletedAt === null && isContractActiveOnDate(c, date))
    .sort((a, b) => {
      const aStart = a.startDate?.getTime() ?? 0;
      const bStart = b.startDate?.getTime() ?? 0;
      return bStart - aStart;
    });

  return active[0] ?? null;
}

export interface ContractConflictPayload {
  contractId: number;
  sponsorId: number;
  sponsorName: string;
  contractType: ContractType;
  contractStatus: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  episodes: Array<{
    id: number;
    title: string | null;
    episodeNumber: number | null;
    guestName: string | null;
  }>;
}

function buildConflictPayload(
  contract: ContractWithRelations,
  overlappingEpisodeIds: number[],
): ContractConflictPayload {
  const idSet = new Set(overlappingEpisodeIds);
  const episodes = contract.episodes
    .filter((link) => idSet.has(link.episodeId))
    .map((link) => {
      const ep = link.episode;
      const guest = ep?.guest;
      return {
        id: link.episodeId,
        title: ep?.title ?? null,
        episodeNumber: ep?.episodeNumber ?? null,
        guestName: guest
          ? `${guest.firstName} ${guest.lastName}`.trim()
          : null,
      };
    });

  return {
    contractId: contract.id,
    sponsorId: contract.sponsorId,
    sponsorName: contract.sponsor.name,
    contractType: contract.contractType,
    contractStatus: contract.contractStatus,
    startDate: contract.startDate?.toISOString().slice(0, 10) ?? null,
    endDate: contract.endDate?.toISOString().slice(0, 10) ?? null,
    episodes,
  };
}

function throwContractOverlap(
  contract: ContractWithRelations,
  overlappingEpisodeIds: number[],
): never {
  const conflict = buildConflictPayload(contract, overlappingEpisodeIds);
  throw new AppError(
    409,
    `Conflit de sponsoring : ${conflict.sponsorName} occupe déjà ${conflict.episodes.length} épisode(s) sur cette période`,
    { conflict },
  );
}

export async function checkOverlap(
  episodeIds: number[],
  startDate: Date,
  endDate: Date | null,
  excludeContractId?: number,
  newContractType?: ContractType,
): Promise<{
  hasOverlap: boolean;
  conflicting?: ContractWithRelations;
  overlappingEpisodeIds?: number[];
}> {
  if (episodeIds.length === 0) return { hasOverlap: false };
  if (!isPaidSpotContractType(newContractType)) return { hasOverlap: false };

  const candidates = await prisma.contractEpisode.findMany({
    where: {
      episodeId: { in: episodeIds },
      contract: {
        deletedAt: null,
        contractStatus: 'active',
        contractType: { in: PAID_SPOT_CONTRACT_TYPES },
        sponsor: { deletedAt: null },
        ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
      },
    },
    include: {
      contract: { include: contractInclude },
    },
  });

  const newStart = startOfDay(startDate);
  const newEnd = endDate ? startOfDay(endDate) : null;

  for (const row of candidates) {
    const c = row.contract;
    const cStart = c.startDate ? startOfDay(c.startDate) : newStart;
    const cEnd = c.endDate ? startOfDay(c.endDate) : null;

    const overlaps =
      (newEnd === null || cStart <= newEnd) &&
      (cEnd === null || cEnd >= newStart);

    if (overlaps) {
      const overlappingEpisodeIds = candidates
        .filter((r) => r.contract.id === c.id && episodeIds.includes(r.episodeId))
        .map((r) => r.episodeId);
      return { hasOverlap: true, conflicting: c, overlappingEpisodeIds };
    }
  }

  return { hasOverlap: false };
}

export interface EpisodeConflictInfo {
  episodeId: number;
  contractId: number;
  sponsorName: string;
  startDate: string | null;
  endDate: string | null;
}

export async function getEpisodeConflicts(
  episodeIds: number[],
  startDate: Date,
  endDate: Date | null,
  excludeContractId?: number,
  newContractType?: ContractType,
): Promise<EpisodeConflictInfo[]> {
  if (episodeIds.length === 0) return [];
  if (!isPaidSpotContractType(newContractType)) return [];

  const candidates = await prisma.contractEpisode.findMany({
    where: {
      episodeId: { in: episodeIds },
      contract: {
        deletedAt: null,
        contractStatus: 'active',
        contractType: { in: PAID_SPOT_CONTRACT_TYPES },
        sponsor: { deletedAt: null },
        ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
      },
    },
    include: {
      contract: { include: contractInclude },
    },
  });

  const newStart = startOfDay(startDate);
  const newEnd = endDate ? startOfDay(endDate) : null;
  const conflicts: EpisodeConflictInfo[] = [];
  const seen = new Set<string>();

  for (const row of candidates) {
    const c = row.contract;
    const cStart = c.startDate ? startOfDay(c.startDate) : newStart;
    const cEnd = c.endDate ? startOfDay(c.endDate) : null;

    const overlaps =
      (newEnd === null || cStart <= newEnd) &&
      (cEnd === null || cEnd >= newStart);

    if (!overlaps) continue;

    const key = `${row.episodeId}-${c.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    conflicts.push({
      episodeId: row.episodeId,
      contractId: c.id,
      sponsorName: c.sponsor.name,
      startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
    });
  }

  return conflicts;
}

export interface CreateContractDto {
  sponsorId: number;
  contractType: ContractType;
  crmStatus?: ContractCrmStatus;
  contractStatus?: ContractStatus;
  startDate?: string | null;
  endDate?: string | null;
  amount?: number;
  currency?: string;
  commissionRate?: number | null;
  promoMessage?: string | null;
  trackingUrl?: string | null;
  discountCode?: string | null;
  youtubeDescriptionTemplate?: string | null;
  autoUpdateYoutube?: boolean;
  notes?: string | null;
  episodeIds?: number[];
  forceOverlap?: boolean;
}

export async function listContracts(filters: {
  page?: number;
  limit?: number;
  contractStatus?: ContractStatus;
  crmStatus?: ContractCrmStatus;
  sponsorId?: number;
  contractType?: ContractType;
  expiringWithinDays?: number;
}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const where: Prisma.SponsorContractWhereInput = {
    deletedAt: null,
    ...(filters.contractStatus && { contractStatus: filters.contractStatus }),
    ...(filters.crmStatus && { crmStatus: filters.crmStatus }),
    ...(filters.sponsorId && { sponsorId: filters.sponsorId }),
    ...(filters.contractType && { contractType: filters.contractType }),
    ...(filters.expiringWithinDays && {
      contractStatus: 'active',
      endDate: {
        lte: new Date(Date.now() + filters.expiringWithinDays * 86400000),
        gte: new Date(),
      },
    }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.sponsorContract.findMany({
      where,
      include: contractInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sponsorContract.count({ where }),
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

export async function getContractById(id: number): Promise<ContractWithRelations> {
  const contract = await prisma.sponsorContract.findFirst({
    where: { id, deletedAt: null },
    include: contractInclude,
  });
  if (!contract) throw new AppError(404, 'Contrat introuvable');
  return contract;
}

async function resolveEpisodeVideoIds(episodeIds: number[]) {
  const episodes = await prisma.episode.findMany({
    where: { id: { in: episodeIds } },
    select: { id: true, youtubeVideoId: true, youtubeEpisodeUrl: true, youtubeLink: true },
  });
  if (episodes.length !== episodeIds.length) {
    throw new AppError(404, 'Un ou plusieurs épisodes introuvables');
  }
  return episodes.map((ep) => ({
    episodeId: ep.id,
    youtubeVideoId:
      ep.youtubeVideoId ||
      youtubeSponsor.resolveVideoId(ep.youtubeEpisodeUrl || ep.youtubeLink || ''),
  }));
}

export async function createContract(data: CreateContractDto) {
  const sponsor = await prisma.sponsor.findFirst({
    where: { id: data.sponsorId, deletedAt: null },
  });
  if (!sponsor) throw new AppError(404, 'Sponsor introuvable');

  const episodeIds = data.episodeIds ?? [];
  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  const endDate = data.endDate ? new Date(data.endDate) : null;

  if (endDate && endDate < startDate) {
    throw new AppError(400, 'La date de fin doit être après la date de début');
  }

  if (episodeIds.length > 0 && !data.forceOverlap) {
    const overlap = await checkOverlap(episodeIds, startDate, endDate, undefined, data.contractType);
    if (overlap.hasOverlap && overlap.conflicting) {
      throwContractOverlap(
        overlap.conflicting,
        overlap.overlappingEpisodeIds ?? episodeIds,
      );
    }
  }

  const episodeMeta = episodeIds.length > 0 ? await resolveEpisodeVideoIds(episodeIds) : [];

  return prisma.$transaction(async (tx) => {
    const contract = await tx.sponsorContract.create({
      data: {
        sponsorId: data.sponsorId,
        contractType: data.contractType,
        crmStatus: data.crmStatus ?? 'prospect',
        contractStatus: data.contractStatus ?? 'draft',
        startDate,
        endDate,
        amount: data.amount ?? 0,
        currency: data.currency ?? 'MAD',
        commissionRate: data.commissionRate ?? null,
        promoMessage: data.promoMessage,
        trackingUrl: data.trackingUrl,
        discountCode: data.discountCode,
        youtubeDescriptionTemplate: data.youtubeDescriptionTemplate,
        autoUpdateYoutube: data.autoUpdateYoutube ?? true,
        notes: data.notes,
        episodes: {
          create: episodeMeta.map((ep) => ({
            episodeId: ep.episodeId,
            youtubeVideoId: ep.youtubeVideoId,
          })),
        },
      },
      include: contractInclude,
    });
    return contract;
  });
}

export async function updateContract(
  id: number,
  data: Partial<CreateContractDto>,
) {
  const existing = await getContractById(id);

  const startDate = data.startDate !== undefined
    ? (data.startDate ? new Date(data.startDate) : null)
    : existing.startDate;
  const endDate = data.endDate !== undefined
    ? (data.endDate ? new Date(data.endDate) : null)
    : existing.endDate;

  if (startDate && endDate && endDate < startDate) {
    throw new AppError(400, 'La date de fin doit être après la date de début');
  }

  const episodeIds = data.episodeIds;
  const contractType = data.contractType ?? existing.contractType;
  if (episodeIds && episodeIds.length > 0 && !data.forceOverlap) {
    // Fall back to the existing start date (or today) so clearing the start date
    // can't be used to bypass overlap detection.
    const overlapStart = startDate ?? existing.startDate ?? new Date();
    const overlap = await checkOverlap(episodeIds, overlapStart, endDate, id, contractType);
    if (overlap.hasOverlap && overlap.conflicting) {
      throwContractOverlap(
        overlap.conflicting,
        overlap.overlappingEpisodeIds ?? episodeIds,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    if (episodeIds) {
      await tx.contractEpisode.deleteMany({ where: { contractId: id } });
      const episodeMeta = await resolveEpisodeVideoIds(episodeIds);
      await tx.contractEpisode.createMany({
        data: episodeMeta.map((ep) => ({
          contractId: id,
          episodeId: ep.episodeId,
          youtubeVideoId: ep.youtubeVideoId,
        })),
      });
    }

    return tx.sponsorContract.update({
      where: { id },
      data: {
        ...(data.sponsorId !== undefined && { sponsorId: data.sponsorId }),
        ...(data.contractType !== undefined && { contractType: data.contractType }),
        ...(data.crmStatus !== undefined && { crmStatus: data.crmStatus }),
        ...(data.contractStatus !== undefined && { contractStatus: data.contractStatus }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
        ...(data.promoMessage !== undefined && { promoMessage: data.promoMessage }),
        ...(data.trackingUrl !== undefined && { trackingUrl: data.trackingUrl }),
        ...(data.discountCode !== undefined && { discountCode: data.discountCode }),
        ...(data.youtubeDescriptionTemplate !== undefined && {
          youtubeDescriptionTemplate: data.youtubeDescriptionTemplate,
        }),
        ...(data.autoUpdateYoutube !== undefined && { autoUpdateYoutube: data.autoUpdateYoutube }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: contractInclude,
    });
  });
}

export async function deleteContract(id: number) {
  await getContractById(id);
  return prisma.sponsorContract.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export interface YoutubeApplySummary {
  success: number;
  failed: number;
  queued: number;
  skipped: number;
}

async function applyYoutubeForContract(
  contract: ContractWithRelations,
  triggeredBy: 'manual' | 'contract_activation' | 'contract_expiry' | 'cron',
): Promise<YoutubeApplySummary> {
  const summary: YoutubeApplySummary = { success: 0, failed: 0, queued: 0, skipped: 0 };
  if (!contract.autoUpdateYoutube) return summary;

  for (const link of contract.episodes) {
    const videoId =
      link.youtubeVideoId ||
      youtubeSponsor.resolveVideoId(
        link.episode.youtubeEpisodeUrl || link.episode.youtubeLink || '',
      );
    if (!videoId) {
      await prisma.contractEpisode.update({
        where: { id: link.id },
        data: {
          youtubeUpdateStatus: 'skipped',
          youtubeUpdateError: 'Aucun ID vidéo YouTube',
        },
      });
      summary.skipped++;
      continue;
    }

    try {
      const result = await youtubeSponsor.applyContractToVideo(
        videoId,
        contract,
        link.episodeId,
        triggeredBy,
      );
      if (result === 'queued') {
        // Quota exceeded → work is queued for retry. The enum has no 'queued'
        // value, so use 'pending' (the not-yet-applied state) with a clear note.
        await prisma.contractEpisode.update({
          where: { id: link.id },
          data: {
            youtubeUpdateStatus: 'pending',
            youtubeUpdateError: 'En file d\'attente — quota YouTube dépassé, réessai automatique',
            youtubeVideoId: videoId,
          },
        });
        summary.queued++;
      } else {
        await prisma.contractEpisode.update({
          where: { id: link.id },
          data: {
            youtubeUpdateStatus: 'success',
            youtubeUpdatedAt: new Date(),
            youtubeUpdateError: null,
            youtubeVideoId: videoId,
          },
        });
        summary.success++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur YouTube';
      await prisma.contractEpisode.update({
        where: { id: link.id },
        data: {
          youtubeUpdateStatus: 'failed',
          youtubeUpdateError: message.slice(0, 2000),
        },
      });
      summary.failed++;
    }
  }

  return summary;
}

export async function activateContract(id: number, forceOverlap = false) {
  const contract = await getContractById(id);

  // Guard against resurrecting terminated contracts or double-activation.
  if (contract.contractStatus === 'cancelled' || contract.contractStatus === 'expired') {
    throw new AppError(
      400,
      'Impossible d\'activer un contrat annulé ou expiré. Créez un nouveau contrat.',
    );
  }
  if (contract.contractStatus === 'active') {
    return { ...contract, youtube: { success: 0, failed: 0, queued: 0, skipped: 0 } };
  }

  const episodeIds = contract.episodes.map((e) => e.episodeId);

  if (!forceOverlap && contract.startDate) {
    const overlap = await checkOverlap(
      episodeIds,
      contract.startDate,
      contract.endDate,
      id,
      contract.contractType,
    );
    if (overlap.hasOverlap && overlap.conflicting) {
      throwContractOverlap(
        overlap.conflicting,
        overlap.overlappingEpisodeIds ?? episodeIds,
      );
    }
  }

  const updated = await prisma.sponsorContract.update({
    where: { id },
    data: { contractStatus: 'active' },
    include: contractInclude,
  });

  const youtube = await applyYoutubeForContract(updated, 'contract_activation');
  return { ...updated, youtube };
}

export async function pauseContract(id: number) {
  await getContractById(id);
  return prisma.sponsorContract.update({
    where: { id },
    data: { contractStatus: 'paused' },
    include: contractInclude,
  });
}

export async function cancelContract(id: number) {
  const contract = await getContractById(id);
  const updated = await prisma.sponsorContract.update({
    where: { id },
    data: { contractStatus: 'cancelled' },
    include: contractInclude,
  });

  for (const link of contract.episodes) {
    const videoId =
      link.youtubeVideoId ||
      youtubeSponsor.resolveVideoId(
        link.episode.youtubeEpisodeUrl || link.episode.youtubeLink || '',
      );
    if (videoId) {
      try {
        await youtubeSponsor.restoreOriginalDescription(
          videoId,
          link.episodeId,
          contract.id,
          'contract_expiry',
        );

        // If other sponsors are still active on this episode, re-render them so
        // cancelling one contract doesn't wipe the remaining sponsors.
        const remaining = await getActiveContractForEpisode(link.episodeId);
        if (remaining && remaining.id !== contract.id) {
          await applyYoutubeForContract(remaining, 'contract_expiry');
        }
      } catch {
        /* logged inside service */
      }
    }
  }

  return updated;
}

export async function addEpisodesToContract(contractId: number, episodeIds: number[]) {
  const contract = await getContractById(contractId);
  const meta = await resolveEpisodeVideoIds(episodeIds);

  if (contract.startDate) {
    const overlap = await checkOverlap(
      episodeIds,
      contract.startDate,
      contract.endDate,
      contractId,
      contract.contractType,
    );
    if (overlap.hasOverlap && overlap.conflicting && contract.contractStatus === 'active') {
      throwContractOverlap(
        overlap.conflicting,
        overlap.overlappingEpisodeIds ?? episodeIds,
      );
    }
  }

  await prisma.contractEpisode.createMany({
    data: meta.map((ep) => ({
      contractId,
      episodeId: ep.episodeId,
      youtubeVideoId: ep.youtubeVideoId,
    })),
    skipDuplicates: true,
  });

  return getContractById(contractId);
}

/**
 * Replace a contract's episode set with `episodeIds`, applying the difference:
 * - removed episodes: restore their YouTube description (and re-render any other
 *   sponsor still active on them);
 * - added episodes: linked, then (if the contract is active) the sponsor block
 *   is applied to YouTube.
 * Returns the refreshed contract.
 */
export async function setContractEpisodes(contractId: number, episodeIds: number[]) {
  const contract = await getContractById(contractId);
  const desired = [...new Set(episodeIds)];
  const currentIds = new Set(contract.episodes.map((l) => l.episodeId));
  const desiredSet = new Set(desired);

  const toAddIds = desired.filter((id) => !currentIds.has(id));
  const toRemoveLinks = contract.episodes.filter((l) => !desiredSet.has(l.episodeId));

  // Nothing changed → no-op.
  if (toAddIds.length === 0 && toRemoveLinks.length === 0) {
    return contract;
  }

  const isActive = contract.contractStatus === 'active';

  // Block overlapping paid spots when adding to an active contract.
  if (toAddIds.length > 0 && isActive && contract.startDate) {
    const overlap = await checkOverlap(
      toAddIds,
      contract.startDate,
      contract.endDate,
      contractId,
      contract.contractType,
    );
    if (overlap.hasOverlap && overlap.conflicting) {
      throwContractOverlap(overlap.conflicting, overlap.overlappingEpisodeIds ?? toAddIds);
    }
  }

  // Restore YouTube for removed episodes (and re-render any remaining sponsor).
  if (isActive) {
    for (const link of toRemoveLinks) {
      const videoId =
        link.youtubeVideoId ||
        youtubeSponsor.resolveVideoId(
          link.episode.youtubeEpisodeUrl || link.episode.youtubeLink || '',
        );
      if (!videoId) continue;
      try {
        await youtubeSponsor.restoreOriginalDescription(
          videoId,
          link.episodeId,
          contract.id,
          'manual',
        );
        const remaining = await getActiveContractForEpisode(link.episodeId);
        if (remaining && remaining.id !== contract.id) {
          await applyYoutubeForContract(remaining, 'manual');
        }
      } catch {
        /* logged inside service */
      }
    }
  }

  // Apply DB diff.
  if (toRemoveLinks.length > 0) {
    await prisma.contractEpisode.deleteMany({
      where: { contractId, episodeId: { in: toRemoveLinks.map((l) => l.episodeId) } },
    });
  }
  if (toAddIds.length > 0) {
    const meta = await resolveEpisodeVideoIds(toAddIds);
    await prisma.contractEpisode.createMany({
      data: meta.map((ep) => ({
        contractId,
        episodeId: ep.episodeId,
        youtubeVideoId: ep.youtubeVideoId,
      })),
      skipDuplicates: true,
    });
  }

  // Apply YouTube for newly added episodes when the contract is active.
  const refreshed = await getContractById(contractId);
  if (isActive && refreshed.autoUpdateYoutube && toAddIds.length > 0) {
    const addedSet = new Set(toAddIds);
    const addedContract: ContractWithRelations = {
      ...refreshed,
      episodes: refreshed.episodes.filter((l) => addedSet.has(l.episodeId)),
    };
    await applyYoutubeForContract(addedContract, 'manual');
  }

  return refreshed;
}

export async function expireDueContracts() {
  const today = startOfDay(new Date());
  const due = await prisma.sponsorContract.findMany({
    where: {
      deletedAt: null,
      contractStatus: 'active',
      endDate: { lt: today },
    },
    include: contractInclude,
  });

  const results: { contractId: number; episodeId: number; action: string }[] = [];

  for (const contract of due) {
    await prisma.sponsorContract.update({
      where: { id: contract.id },
      data: { contractStatus: 'expired' },
    });

    for (const link of contract.episodes) {
      const videoId =
        link.youtubeVideoId ||
        youtubeSponsor.resolveVideoId(
          link.episode.youtubeEpisodeUrl || link.episode.youtubeLink || '',
        );
      if (videoId) {
        await youtubeSponsor.restoreOriginalDescription(
          videoId,
          link.episodeId,
          contract.id,
          'contract_expiry',
        ).catch(() => undefined);
      }

      const replacement = await getActiveContractForEpisode(link.episodeId);
      if (replacement && replacement.id !== contract.id) {
        await applyYoutubeForContract(replacement, 'contract_expiry');
        results.push({ contractId: contract.id, episodeId: link.episodeId, action: 'replaced' });
      } else {
        results.push({ contractId: contract.id, episodeId: link.episodeId, action: 'restored' });
      }
    }
  }

  return { expired: due.length, results };
}

export async function getSponsorDashboardStats() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [active, expiring, pendingQueue, monthRevenue, prevRevenue] = await Promise.all([
    prisma.sponsorContract.count({
      where: { deletedAt: null, contractStatus: 'active' },
    }),
    prisma.sponsorContract.count({
      where: {
        deletedAt: null,
        contractStatus: 'active',
        endDate: { gte: now, lte: in30 },
      },
    }),
    prisma.youtubeSyncQueue.count({ where: { status: 'pending' } }),
    prisma.sponsorContract.aggregate({
      where: {
        deletedAt: null,
        contractStatus: 'active',
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: monthStart } }],
      },
      _sum: { amount: true },
    }),
    prisma.sponsorContract.aggregate({
      where: {
        deletedAt: null,
        contractStatus: { in: ['active', 'expired'] },
        startDate: { lte: prevMonthEnd },
        OR: [{ endDate: null }, { endDate: { gte: prevMonthStart } }],
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    activeContracts: active,
    expiringWithin30Days: expiring,
    pendingYoutubeQueue: pendingQueue,
    monthRevenue: Number(monthRevenue._sum.amount ?? 0),
    prevMonthRevenue: Number(prevRevenue._sum.amount ?? 0),
  };
}

export async function listYoutubeLogs(filters: {
  page?: number;
  limit?: number;
  youtubeVideoId?: string;
  success?: boolean;
}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 30;
  const where: Prisma.SponsorYoutubeLogWhereInput = {
    ...(filters.youtubeVideoId && { youtubeVideoId: filters.youtubeVideoId }),
    ...(filters.success !== undefined && { success: filters.success }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.sponsorYoutubeLog.findMany({
      where,
      include: { contract: { include: { sponsor: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sponsorYoutubeLog.count({ where }),
  ]);

  return { data, pagination: { page, limit, total } };
}
