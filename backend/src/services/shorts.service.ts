import { ShortPlatform } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function listShorts(episodeId?: number) {
  return prisma.short.findMany({
    where: episodeId ? { episodeId } : undefined,
    include: { episode: { include: { guest: true } } },
    orderBy: { id: 'desc' },
  });
}

export async function createShort(data: {
  episodeId: number;
  platform: ShortPlatform;
  title: string;
  views?: number;
  likes?: number;
  shares?: number;
  url: string;
  description?: string;
  publishedAt?: Date;
}) {
  const episode = await prisma.episode.findUnique({ where: { id: data.episodeId } });
  if (!episode) throw new AppError(404, 'Episode not found');

  return prisma.short.create({
    data: {
      episodeId: data.episodeId,
      platform: data.platform,
      title: data.title,
      views: data.views ?? 0,
      likes: data.likes ?? 0,
      shares: data.shares ?? 0,
      url: data.url,
      description: data.description ?? '',
      publishedAt: data.publishedAt,
    },
  });
}

export async function updateShort(
  id: number,
  data: Partial<{
    platform: ShortPlatform;
    title: string;
    views: number;
    likes: number;
    shares: number;
    url: string;
    description: string;
    publishedAt: Date;
  }>,
) {
  const existing = await prisma.short.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Short not found');

  return prisma.short.update({ where: { id }, data });
}

export async function deleteShort(id: number) {
  const existing = await prisma.short.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Short not found');
  await prisma.short.delete({ where: { id } });
}
