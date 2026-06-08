import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { getSetting, getYoutubeApiKey } from './settings.service';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
    /youtube\.com\/shorts\/([^?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export const extractVideoId = extractYoutubeVideoId;

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  return h * 3600 + m * 60 + s;
}

export interface YoutubeStatsPayload {
  youtubeVideoId: string;
  youtubeViews: number;
  youtubeLikes: number;
  youtubeComments: number;
  youtubeDuration: number;
  engagementRate: number;
  lastYoutubeSync: Date;
  views: number;
}

export async function fetchYoutubeStats(videoId: string, apiKey?: string): Promise<YoutubeStatsPayload> {
  const key = apiKey || (await getYoutubeApiKey()) || process.env.YOUTUBE_API_KEY;
  if (!key) throw new AppError(400, 'YOUTUBE_API_KEY non configurée');

  const url = `${YOUTUBE_API_BASE}/videos?part=statistics,contentDetails&id=${videoId}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new AppError(res.status, `YouTube API error: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    items?: {
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails?: { duration?: string };
    }[];
    error?: { message?: string };
  };

  if (data.error) throw new AppError(400, data.error.message || 'YouTube API error');

  const item = data.items?.[0];
  if (!item) throw new AppError(404, 'Vidéo introuvable ou URL invalide');

  const stats = item.statistics;
  const duration = parseDuration(item.contentDetails?.duration || 'PT0S');

  const views = parseInt(stats?.viewCount || '0', 10);
  const likes = parseInt(stats?.likeCount || '0', 10);
  const comments = parseInt(stats?.commentCount || '0', 10);
  const engagementRate = views > 0
    ? parseFloat(((likes + comments) / views * 100).toFixed(2))
    : 0;

  return {
    youtubeVideoId: videoId,
    youtubeViews: views,
    youtubeLikes: likes,
    youtubeComments: comments,
    youtubeDuration: duration,
    engagementRate,
    lastYoutubeSync: new Date(),
    views,
  };
}

export async function testYoutubeConnection(): Promise<{ ok: boolean; connected?: boolean; message: string }> {
  try {
    const key = (await getYoutubeApiKey()) || process.env.YOUTUBE_API_KEY;
    if (!key) return { ok: false, connected: false, message: 'Clé API non configurée' };

    const res = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=id&id=dQw4w9WgXcQ&key=${key}`,
    );
    const data = (await res.json()) as { error?: { message?: string } };
    if (data.error) return { ok: false, connected: false, message: data.error.message || 'YouTube API error' };
    if (res.ok) return { ok: true, connected: true, message: 'API YouTube opérationnelle' };
    return { ok: false, connected: false, message: `Erreur HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, connected: false, message: e instanceof Error ? e.message : 'Erreur inconnue' };
  }
}

export async function syncEpisodeYoutubeStats(episodeId: number) {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { guest: true },
  });
  if (!episode) throw new AppError(404, 'Épisode introuvable');

  const youtubeUrl = episode.youtubeEpisodeUrl || episode.youtubeLink;
  // Always derive the ID from the current URL so a changed URL does not reuse a stale videoId.
  const videoId = extractYoutubeVideoId(youtubeUrl || '') || episode.youtubeVideoId;
  if (!videoId) throw new AppError(400, 'Vidéo introuvable ou URL invalide');

  const stats = await fetchYoutubeStats(videoId);

  const updated = await prisma.episode.update({
    where: { id: episodeId },
    data: {
      ...stats,
      lastSyncAt: stats.lastYoutubeSync,
    },
    include: { guest: true },
  });

  await prisma.platformStat.create({
    data: {
      platform: 'youtube',
      metricKey: `episode_${episodeId}_views`,
      metricValue: stats.youtubeViews,
    },
  });

  return { success: true, episode: updated, stats: updated };
}

export async function syncOnSave(youtubeUrl: string, episodeId: number) {
  const videoId = extractYoutubeVideoId(youtubeUrl);
  if (!videoId) throw new AppError(400, 'Vidéo introuvable ou URL invalide');

  const stats = await fetchYoutubeStats(videoId);
  const updated = await prisma.episode.update({
    where: { id: episodeId },
    data: {
      youtubeEpisodeUrl: youtubeUrl,
      ...stats,
      lastSyncAt: stats.lastYoutubeSync,
    },
  });

  return { success: true, stats: updated };
}

export async function syncAllEpisodeStats() {
  const episodes = await prisma.episode.findMany({
    where: {
      OR: [
        { youtubeEpisodeUrl: { not: null } },
        { youtubeLink: { not: null } },
        { youtubeVideoId: { not: null } },
      ],
    },
  });

  const results: { episodeId: number; success: boolean; error?: string }[] = [];

  for (const ep of episodes) {
    try {
      await syncEpisodeYoutubeStats(ep.id);
      results.push({ episodeId: ep.id, success: true });
    } catch (e) {
      results.push({
        episodeId: ep.id,
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  await prisma.appSetting.upsert({
    where: { settingKey: 'youtube_last_sync' },
    create: { settingKey: 'youtube_last_sync', settingValue: new Date().toISOString() },
    update: { settingValue: new Date().toISOString() },
  });

  return {
    synced: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    total: results.length,
    results,
  };
}

export async function getEpisodeYoutubeStats(episodeId: number) {
  const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
  if (!episode) throw new AppError(404, 'Episode not found');
  return {
    videoId: episode.youtubeVideoId,
    views: episode.youtubeViews,
    likes: episode.youtubeLikes,
    comments: episode.youtubeComments,
    duration: episode.youtubeDuration,
    engagementRate: episode.engagementRate ? Number(episode.engagementRate) : 0,
    lastYoutubeSync: episode.lastYoutubeSync || episode.lastSyncAt,
  };
}
