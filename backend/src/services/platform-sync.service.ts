import type { Platform } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { encryptToken } from '../utils/crypto';
import { YouTubeService } from './platforms/youtube.service';
import { SpotifyService } from './platforms/spotify.service';
import { TikTokService } from './platforms/tiktok.service';
import { InstagramService } from './platforms/instagram.service';
import type { PlatformFetcher } from './platforms/types';
import { getValidAccessToken, recordSyncResult } from './platform-token.service';

const fetchers: PlatformFetcher[] = [
  new YouTubeService(),
  new SpotifyService(),
  new TikTokService(),
  new InstagramService(),
];

let syncing = false;

export function isPlatformSyncing(): boolean {
  return syncing;
}

export async function syncPlatformStats(): Promise<void> {
  if (syncing) return;
  syncing = true;

  try {
    for (const fetcher of fetchers) {
      const tokenRow = await prisma.platformToken.findUnique({
        where: { platform: fetcher.platform },
      });
      if (!tokenRow) continue;

      try {
        const accessToken = await getValidAccessToken(fetcher.platform);
        if (!accessToken) continue;

        const { metrics, error } = await fetcher.fetchMetrics(accessToken);

        if (metrics.length > 0) {
          await prisma.platformStat.createMany({
            data: metrics.map((m) => ({
              platform: fetcher.platform,
              metricKey: m.metricKey,
              metricValue: m.metricValue,
              recordedAt: new Date(),
            })),
          });
          await recordSyncResult(fetcher.platform, true);
          console.log(`[PlatformSync] ${fetcher.platform}: ${metrics.length} métriques enregistrées`);
        } else {
          await recordSyncResult(fetcher.platform, false, error);
          console.warn(`[PlatformSync] ${fetcher.platform}: aucune donnée — ${error ?? 'inconnu'}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur sync';
        await recordSyncResult(fetcher.platform, false, message);
        console.error(`[PlatformSync] ${fetcher.platform} failed:`, err);
      }
    }
  } finally {
    syncing = false;
  }
}

export async function upsertPlatformToken(
  platform: Platform,
  accessToken: string,
  refreshToken?: string | null,
  expiresAt?: Date | null,
  scope?: string | null,
): Promise<void> {
  await prisma.platformToken.upsert({
    where: { platform },
    create: {
      platform,
      accessToken: encryptToken(accessToken),
      refreshToken: refreshToken ? encryptToken(refreshToken) : null,
      expiresAt: expiresAt ?? null,
      scope: scope ?? null,
      lastSyncError: null,
    },
    update: {
      accessToken: encryptToken(accessToken),
      refreshToken: refreshToken ? encryptToken(refreshToken) : null,
      expiresAt: expiresAt ?? null,
      ...(scope !== undefined && scope !== null ? { scope } : {}),
      lastSyncError: null,
    },
  });

  // Don't block the OAuth callback redirect on an external stats sync — a slow or
  // failing platform API must not turn a successful connect into an error page.
  void syncPlatformStats().catch((err) =>
    console.error('[PlatformSync] post-connect sync failed:', err),
  );
}
