import type { Platform } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptToken, encryptToken } from '../utils/crypto';

async function refreshSpotifyToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Spotify OAuth credentials missing');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof data.error_description === 'string'
        ? data.error_description
        : 'Échec du rafraîchissement du token Spotify',
    );
  }

  return data as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };
}

async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('YouTube OAuth credentials missing');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof data.error_description === 'string'
        ? data.error_description
        : 'Échec du rafraîchissement du token Google',
    );
  }

  return data as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };
}

export async function getValidAccessToken(platform: Platform): Promise<string | null> {
  const row = await prisma.platformToken.findUnique({ where: { platform } });
  if (!row) return null;

  const expiresSoon =
    row.expiresAt && row.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if ((expiresSoon || (row.expiresAt && row.expiresAt < new Date())) && row.refreshToken) {
    if (platform === 'youtube' || platform === 'spotify') {
      try {
        const refreshFn = platform === 'youtube' ? refreshGoogleToken : refreshSpotifyToken;
        const refreshed = await refreshFn(decryptToken(row.refreshToken));
        const expiresAt = refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000)
          : null;

        await prisma.platformToken.update({
          where: { platform },
          data: {
            accessToken: encryptToken(refreshed.access_token),
            refreshToken: refreshed.refresh_token
              ? encryptToken(refreshed.refresh_token)
              : row.refreshToken,
            expiresAt,
            ...(refreshed.scope ? { scope: refreshed.scope } : {}),
          },
        });

        return refreshed.access_token;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'refresh failed';
        console.warn(`[PlatformToken] ${platform} refresh failed:`, err);
        // Persist a reconnect signal so the UI / write paths can react instead of
        // silently using a stale token.
        await prisma.platformToken
          .update({
            where: { platform },
            data: { lastSyncError: `reconnect_required: ${message}`.slice(0, 2000) },
          })
          .catch(() => undefined);

        // If the current access token is still valid for now, fall through and use
        // it; otherwise force the caller to treat the integration as disconnected.
        const stillValid = row.expiresAt && row.expiresAt > new Date();
        if (!stillValid) return null;
      }
    }
  }

  return decryptToken(row.accessToken);
}

export async function recordSyncResult(
  platform: Platform,
  success: boolean,
  error?: string,
): Promise<void> {
  await prisma.platformToken.updateMany({
    where: { platform },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: success ? null : (error?.slice(0, 2000) ?? 'Erreur inconnue'),
    },
  });
}
