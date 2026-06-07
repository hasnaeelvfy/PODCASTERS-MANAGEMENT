import type { Platform } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isPlatformSyncing } from './platform-sync.service';
import { oauthService } from './oauth.service';

const PLATFORMS: Platform[] = ['youtube', 'spotify', 'tiktok', 'instagram'];

const METRIC_LABELS: Record<string, string> = {
  viewCount: 'Vues totales',
  subscriberCount: 'Abonnés',
  videoCount: 'Vidéos',
  views: 'Vues (28j)',
  estimatedMinutesWatched: 'Minutes regardées',
  subscribersGained: 'Abonnés gagnés',
  starts: 'Démarrages',
  listeners: 'Auditeurs',
  streams: 'Streams',
  follower_count: 'Abonnés',
  likes_count: 'J\'aime',
  video_count: 'Vidéos',
  followers_count: 'Abonnés',
  media_count: 'Publications',
  impressions: 'Impressions',
  reach: 'Portée',
  profile_views: 'Vues profil',
};

const PRIMARY_AUDIENCE_METRICS: Record<Platform, string[]> = {
  youtube: ['viewCount', 'views', 'subscriberCount'],
  spotify: ['streams', 'listeners', 'starts'],
  tiktok: ['follower_count', 'likes_count', 'video_count'],
  instagram: ['reach', 'followers_count', 'impressions'],
};

function pickAudienceMetric(
  stats: { metricKey: string; metricValue: { toString(): string }; recordedAt: Date }[],
  keys: string[],
): number {
  for (const key of keys) {
    const latest = stats.find((s) => s.metricKey === key);
    if (latest) return Number(latest.metricValue);
  }
  return 0;
}

function buildAudienceGrowth(
  stats: { metricKey: string; metricValue: { toString(): string }; recordedAt: Date }[],
  keys: string[],
): { month: string; value: number }[] {
  const primaryKey = keys.find((k) => stats.some((s) => s.metricKey === k));
  if (!primaryKey) return [];

  const byMonth = new Map<string, number>();
  const sorted = [...stats]
    .filter((s) => s.metricKey === primaryKey)
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

  for (const stat of sorted) {
    const month = stat.recordedAt.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    byMonth.set(month, Number(stat.metricValue));
  }

  return [...byMonth.entries()].map(([month, value]) => ({ month, value }));
}

function calcGrowthRate(growth: { month: string; value: number }[]): number {
  if (growth.length < 2) return growth.length === 1 && growth[0].value > 0 ? 100 : 0;
  const prev = growth[growth.length - 2].value;
  const curr = growth[growth.length - 1].value;
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export const analyticsService = {
  async getConnections() {
    return oauthService.getConnections();
  },

  async getPlatformAnalytics() {
    const latestByPlatform = await Promise.all(
      PLATFORMS.map(async (platform) => {
        const stats = await prisma.platformStat.findMany({
          where: { platform },
          orderBy: { recordedAt: 'desc' },
          take: 200,
        });

        const latestSync = stats[0]?.recordedAt ?? null;
        const seen = new Set<string>();
        const metrics: { key: string; label: string; value: number; recordedAt: string }[] = [];

        for (const stat of stats) {
          if (seen.has(stat.metricKey)) continue;
          seen.add(stat.metricKey);
          metrics.push({
            key: stat.metricKey,
            label: METRIC_LABELS[stat.metricKey] || stat.metricKey,
            value: Number(stat.metricValue),
            recordedAt: stat.recordedAt.toISOString(),
          });
        }

        const audienceGrowth = buildAudienceGrowth(stats, PRIMARY_AUDIENCE_METRICS[platform]);
        const growthRate = calcGrowthRate(audienceGrowth);
        const currentAudience = pickAudienceMetric(stats, PRIMARY_AUDIENCE_METRICS[platform]);

        const token = await prisma.platformToken.findUnique({ where: { platform } });

        return {
          platform,
          metrics,
          currentAudience,
          audienceGrowth,
          growthRate,
          lastSync: latestSync?.toISOString() ?? token?.lastSyncAt?.toISOString() ?? null,
          connected: !!token,
          hasData: metrics.length > 0,
          syncError: token?.lastSyncError ?? null,
        };
      }),
    );

    const growthRates = latestByPlatform
      .filter((p) => p.hasData && p.growthRate !== 0)
      .map((p) => p.growthRate);
    const overallGrowthRate =
      growthRates.length > 0
        ? Math.round((growthRates.reduce((a, b) => a + b, 0) / growthRates.length) * 10) / 10
        : latestByPlatform.some((p) => p.currentAudience > 0)
          ? 100
          : 0;

    return {
      platforms: latestByPlatform,
      overallGrowthRate,
      syncing: isPlatformSyncing(),
      syncedAt: new Date().toISOString(),
    };
  },
};
