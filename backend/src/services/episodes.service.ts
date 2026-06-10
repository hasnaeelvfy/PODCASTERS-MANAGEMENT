import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function listEpisodes() {
  return prisma.episode.findMany({
    include: {
      guest: { include: { stage: true } },
      shorts: true,
      sponsors: true,
      contractEpisodes: {
        where: {
          contract: { deletedAt: null, contractStatus: 'active' },
        },
        include: {
          contract: { include: { sponsor: true } },
        },
      },
    },
    orderBy: [{ episodeNumber: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getEpisodeById(id: number) {
  const episode = await prisma.episode.findUnique({
    where: { id },
    include: { guest: true, shorts: true, sponsors: true },
  });
  if (!episode) throw new AppError(404, 'Episode not found');
  return episode;
}

export async function createEpisode(data: {
  guestId: number;
  episodeNumber?: number;
  title?: string;
  recordingDate?: string;
  publicationDate?: string;
  spotifyLink?: string;
  youtubeLink?: string;
  youtubeEpisodeUrl?: string;
  spotifyEpisodeUrl?: string;
  listens?: number;
  views?: number;
  shares?: number;
  completionRate?: number;
}) {
  const guest = await prisma.guest.findUnique({ where: { id: data.guestId } });
  if (!guest) throw new AppError(404, 'Guest not found');

  const existing = await prisma.episode.findUnique({ where: { guestId: data.guestId } });
  if (existing) throw new AppError(409, 'Episode already exists for this guest');

  return prisma.episode.create({
    data: {
      guestId: data.guestId,
      episodeNumber: data.episodeNumber,
      title: data.title,
      recordingDate: data.recordingDate ? new Date(data.recordingDate) : null,
      publicationDate: data.publicationDate ? new Date(data.publicationDate) : null,
      spotifyLink: data.spotifyLink,
      youtubeLink: data.youtubeLink,
      youtubeEpisodeUrl: data.youtubeEpisodeUrl,
      spotifyEpisodeUrl: data.spotifyEpisodeUrl,
      listens: data.listens ?? 0,
      views: data.views ?? 0,
      shares: data.shares ?? 0,
      completionRate: data.completionRate != null ? new Prisma.Decimal(data.completionRate) : null,
    },
    include: { guest: true, shorts: true, sponsors: true },
  });
}

export async function updateEpisode(
  id: number,
  data: Partial<{
    episodeNumber: number;
    title: string;
    recordingDate: string;
    publicationDate: string;
    spotifyLink: string;
    youtubeLink: string;
    youtubeEpisodeUrl: string;
    spotifyEpisodeUrl: string;
    listens: number;
    views: number;
    shares: number;
    completionRate: number | null;
  }>,
) {
  const existing = await getEpisodeById(id);
  const youtubeUrlChanged =
    data.youtubeEpisodeUrl !== undefined &&
    data.youtubeEpisodeUrl !== existing.youtubeEpisodeUrl;

  return prisma.episode.update({
    where: { id },
    data: {
      ...data,
      ...(youtubeUrlChanged
        ? {
            youtubeVideoId: null,
            youtubeViews: 0,
            youtubeLikes: 0,
            youtubeComments: 0,
            youtubeDuration: null,
            engagementRate: null,
            shares: 0,
            lastYoutubeSync: null,
          }
        : {}),
      recordingDate: data.recordingDate ? new Date(data.recordingDate) : undefined,
      publicationDate: data.publicationDate ? new Date(data.publicationDate) : undefined,
      completionRate:
        data.completionRate === null
          ? null
          : data.completionRate != null
            ? new Prisma.Decimal(data.completionRate)
            : undefined,
    },
    include: { guest: true, shorts: true, sponsors: true },
  });
}

export async function deleteEpisode(id: number) {
  await getEpisodeById(id);
  await prisma.episode.delete({ where: { id } });
}

export async function upsertEpisodeForGuest(
  guestId: number,
  data: Partial<{
    episodeNumber: number;
    title: string;
    recordingDate: string;
    publicationDate: string;
    spotifyLink: string;
    youtubeLink: string;
    youtubeEpisodeUrl: string;
    spotifyEpisodeUrl: string;
    listens: number;
    views: number;
    shares: number;
    completionRate: number | null;
  }>,
) {
  return prisma.episode.upsert({
    where: { guestId },
    create: {
      guestId,
      episodeNumber: data.episodeNumber,
      title: data.title,
      recordingDate: data.recordingDate ? new Date(data.recordingDate) : null,
      publicationDate: data.publicationDate ? new Date(data.publicationDate) : null,
      spotifyLink: data.spotifyLink,
      youtubeLink: data.youtubeLink,
      youtubeEpisodeUrl: data.youtubeEpisodeUrl,
      spotifyEpisodeUrl: data.spotifyEpisodeUrl,
      listens: data.listens ?? 0,
      views: data.views ?? 0,
      shares: data.shares ?? 0,
      completionRate:
        data.completionRate != null ? new Prisma.Decimal(data.completionRate) : null,
    },
    update: {
      episodeNumber: data.episodeNumber,
      title: data.title,
      recordingDate: data.recordingDate ? new Date(data.recordingDate) : undefined,
      publicationDate: data.publicationDate ? new Date(data.publicationDate) : undefined,
      spotifyLink: data.spotifyLink,
      youtubeLink: data.youtubeLink,
      youtubeEpisodeUrl: data.youtubeEpisodeUrl,
      spotifyEpisodeUrl: data.spotifyEpisodeUrl,
      listens: data.listens,
      views: data.views,
      shares: data.shares,
      completionRate:
        data.completionRate === null
          ? null
          : data.completionRate != null
            ? new Prisma.Decimal(data.completionRate)
            : undefined,
    },
    include: { shorts: true, sponsors: true },
  });
}
