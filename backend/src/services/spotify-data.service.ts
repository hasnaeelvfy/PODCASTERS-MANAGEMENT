import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { getValidAccessToken } from './platform-token.service';
import { getSpotifyRedirectUri } from '../lib/spotify-oauth.config';
import { oauthService } from './oauth.service';

const SPOTIFY_ANALYTICS_BASE = 'https://generic.wg.spotify.com/podcasters-analytics-api';

export function parseSpotifyEpisodeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const episodeIdx = parts.indexOf('episode');
    if (episodeIdx >= 0 && parts[episodeIdx + 1]) {
      return parts[episodeIdx + 1];
    }
  } catch {
    // fall through to regex
  }

  const patterns = [
    /open\.spotify\.com\/episode\/([a-zA-Z0-9]+)/,
    /spotify\.com\/episode\/([a-zA-Z0-9]+)/,
    /spotify:episode:([a-zA-Z0-9]+)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function resolveShowId(): string {
  const showId = process.env.SPOTIFY_SHOW_ID;
  if (!showId) {
    throw new AppError(400, 'SPOTIFY_SHOW_ID non configuré dans .env');
  }
  return showId;
}

function resolveLicensorId(): string {
  return process.env.SPOTIFY_LICENSOR_ID || resolveShowId();
}

export interface SpotifyEpisodeStatsPayload {
  spotifyEpisodeId: string;
  listens: number;
  completionRate: number | null;
  lastSpotifySync: Date;
}

export async function getSpotifyStatus(): Promise<{
  ok: boolean;
  connected: boolean;
  oauthConfigured: boolean;
  message: string;
  redirectUri: string;
  lastSync?: string | null;
  lastError?: string | null;
}> {
  const redirectUri = getSpotifyRedirectUri();
  const oauthConfigured = oauthService.isConfigured('spotify');
  const token = await prisma.platformToken.findUnique({ where: { platform: 'spotify' } });
  const connected = !!token;

  if (!oauthConfigured) {
    return {
      ok: false,
      connected: false,
      oauthConfigured: false,
      redirectUri,
      message: 'SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET non configurés',
    };
  }

  if (!connected) {
    return {
      ok: false,
      connected: false,
      oauthConfigured: true,
      redirectUri,
      message: 'Spotify non connecté — connectez-vous dans Paramètres',
    };
  }

  return {
    ok: true,
    connected: true,
    oauthConfigured: true,
    redirectUri,
    message: 'Spotify for Creators connecté',
    lastSync: token.lastSyncAt?.toISOString() ?? null,
    lastError: token.lastSyncError ?? null,
  };
}

function mapSpotifyApiError(raw: string, httpStatus: number): AppError {
  const text = raw.trim();
  if (/networkid.*does not match|does not match.*networkid/i.test(text)) {
    return new AppError(
      503,
      'Cet épisode n\'appartient pas au podcast que vous déclarez — saisie manuelle activée',
    );
  }
  return new AppError(httpStatus, `Spotify API error: ${text.slice(0, 200)}`);
}

export async function fetchSpotifyEpisodeStats(
  spotifyEpisodeId: string,
  accessToken?: string,
): Promise<SpotifyEpisodeStatsPayload> {
  const token = accessToken ?? (await getValidAccessToken('spotify'));
  if (!token) {
    throw new AppError(401, 'Spotify non connecté — connectez votre compte dans Paramètres');
  }

  const showId = resolveShowId();
  const licensorId = resolveLicensorId();
  const url =
    `${SPOTIFY_ANALYTICS_BASE}/licensors/${licensorId}/podcasts/${showId}/episodes/${spotifyEpisodeId}/aggregate`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 403) {
    throw new AppError(
      503,
      'Sync Spotify indisponible — saisie manuelle activée',
    );
  }

  if (res.status === 404) {
    console.warn(`[Spotify] Episode stats 404: ${url}`);
    throw new AppError(
      503,
      'Stats Spotify pas encore disponibles pour cet épisode (souvent 24–48h après publication) — saisie manuelle activée',
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw mapSpotifyApiError(text, res.status);
  }

  const body = (await res.json()) as Record<string, unknown>;
  const listens =
    typeof body.starts === 'number'
      ? body.starts
      : typeof body.streams === 'number'
        ? body.streams
        : 0;

  let completionRate: number | null = null;
  const rawCompletion =
    body.completionRate ??
    body.averageCompletionRate ??
    body.avgCompletionRate ??
    body.completion_rate;
  if (typeof rawCompletion === 'number') {
    completionRate = Math.min(100, Math.max(0, parseFloat(rawCompletion.toFixed(2))));
  }

  return {
    spotifyEpisodeId,
    listens,
    completionRate,
    lastSpotifySync: new Date(),
  };
}

export async function syncEpisodeSpotifyStats(
  episodeId: number,
  options?: { spotifyEpisodeUrl?: string },
) {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { guest: true },
  });
  if (!episode) throw new AppError(404, 'Épisode introuvable');

  const spotifyUrl =
    options?.spotifyEpisodeUrl?.trim() ||
    episode.spotifyEpisodeUrl ||
    episode.spotifyLink;
  const spotifyEpisodeId =
    parseSpotifyEpisodeId(spotifyUrl || '') || episode.spotifyEpisodeId;
  if (!spotifyEpisodeId) {
    throw new AppError(
      400,
      'URL Spotify invalide — collez un lien https://open.spotify.com/episode/...',
    );
  }

  if (options?.spotifyEpisodeUrl?.trim()) {
    await prisma.episode.update({
      where: { id: episodeId },
      data: {
        spotifyEpisodeUrl: options.spotifyEpisodeUrl.trim(),
        spotifyEpisodeId,
      },
    });
  }

  const stats = await fetchSpotifyEpisodeStats(spotifyEpisodeId);

  const updated = await prisma.episode.update({
    where: { id: episodeId },
    data: {
      spotifyEpisodeId,
      listens: stats.listens,
      completionRate:
        stats.completionRate != null
          ? new Prisma.Decimal(stats.completionRate)
          : episode.completionRate,
      lastSpotifySync: stats.lastSpotifySync,
    },
    include: { guest: true },
  });

  try {
    await prisma.platformStat.create({
      data: {
        platform: 'spotify',
        metricKey: `episode_${episodeId}_starts`,
        metricValue: stats.listens,
      },
    });
  } catch (err) {
    console.error('[Spotify] platform_stats insert failed:', err);
  }

  return { success: true, episode: updated, stats: updated, manualFallback: false };
}

export async function syncOnSave(spotifyUrl: string, episodeId: number) {
  const episode = await syncEpisodeSpotifyStats(episodeId, { spotifyEpisodeUrl: spotifyUrl });
  return { success: true, stats: episode.stats ?? episode.episode, manualFallback: false };
}

export async function syncAllSpotifyStats() {
  const episodes = await prisma.episode.findMany({
    where: {
      OR: [
        { spotifyEpisodeUrl: { not: null } },
        { spotifyLink: { not: null } },
        { spotifyEpisodeId: { not: null } },
      ],
    },
  });

  const token = await getValidAccessToken('spotify');
  if (!token) {
    return {
      synced: 0,
      failed: 0,
      total: episodes.length,
      skipped: true,
      message: 'Spotify non connecté',
      results: [],
    };
  }

  const results: { episodeId: number; success: boolean; error?: string }[] = [];

  for (const ep of episodes) {
    try {
      await syncEpisodeSpotifyStats(ep.id);
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
    where: { settingKey: 'spotify_last_sync' },
    create: { settingKey: 'spotify_last_sync', settingValue: new Date().toISOString() },
    update: { settingValue: new Date().toISOString() },
  });

  return {
    synced: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    total: results.length,
    results,
  };
}
