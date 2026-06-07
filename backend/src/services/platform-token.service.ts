import type { Platform } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptToken, encryptToken } from '../utils/crypto';

async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
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

  return data as { access_token: string; refresh_token?: string; expires_in?: number };
}

export async function getValidAccessToken(platform: Platform): Promise<string | null> {
  const row = await prisma.platformToken.findUnique({ where: { platform } });
  if (!row) return null;

  const expiresSoon =
    row.expiresAt && row.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if ((expiresSoon || (row.expiresAt && row.expiresAt < new Date())) && row.refreshToken) {
    if (platform === 'youtube') {
      try {
        const refreshed = await refreshGoogleToken(decryptToken(row.refreshToken));
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
          },
        });

        return refreshed.access_token;
      } catch (err) {
        console.warn('[PlatformToken] Google refresh failed:', err);
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
