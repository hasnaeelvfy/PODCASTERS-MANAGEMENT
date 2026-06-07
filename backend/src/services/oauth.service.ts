import type { Platform } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { upsertPlatformToken } from './platform-sync.service';

const PLATFORMS: Platform[] = ['youtube', 'spotify', 'tiktok', 'instagram'];

type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  extraAuthParams?: Record<string, string>;
  useBasicAuth?: boolean;
};

function envKey(platform: Platform, suffix: string): string {
  return `${platform.toUpperCase()}_${suffix}`;
}

function getOAuthConfig(platform: Platform): OAuthConfig | null {
  const commonRedirect = process.env.OAUTH_REDIRECT_BASE;
  const defaultRedirect = commonRedirect
    ? `${commonRedirect}/analytics/oauth/${platform}/callback`
    : `http://localhost:4000/api/analytics/oauth/${platform}/callback`;

  const configs: Record<Platform, () => OAuthConfig | null> = {
    youtube: () => {
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        clientId,
        clientSecret,
        redirectUri: process.env.YOUTUBE_REDIRECT_URI || defaultRedirect,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: [
          'https://www.googleapis.com/auth/yt-analytics.readonly',
          'https://www.googleapis.com/auth/youtube.readonly',
        ],
        extraAuthParams: { access_type: 'offline', prompt: 'consent' },
      };
    },
    spotify: () => {
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        clientId,
        clientSecret,
        redirectUri: process.env.SPOTIFY_REDIRECT_URI || defaultRedirect,
        authUrl: 'https://accounts.spotify.com/authorize',
        tokenUrl: 'https://accounts.spotify.com/api/token',
        scopes: ['user-read-email', 'user-read-private'],
        useBasicAuth: true,
      };
    },
    tiktok: () => {
      const clientId = process.env.TIKTOK_CLIENT_KEY || process.env[envKey('tiktok', 'CLIENT_ID')];
      const clientSecret =
        process.env.TIKTOK_CLIENT_SECRET || process.env[envKey('tiktok', 'CLIENT_SECRET')];
      if (!clientId || !clientSecret) return null;
      return {
        clientId,
        clientSecret,
        redirectUri: process.env.TIKTOK_REDIRECT_URI || defaultRedirect,
        authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
        tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
        scopes: ['user.info.basic', 'video.list'],
      };
    },
    instagram: () => {
      const clientId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID;
      const clientSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        clientId,
        clientSecret,
        redirectUri: process.env.INSTAGRAM_REDIRECT_URI || defaultRedirect,
        authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
        scopes: [
          'instagram_basic',
          'instagram_manage_insights',
          'pages_show_list',
          'pages_read_engagement',
        ],
      };
    },
  };

  return configs[platform]();
}

function signOAuthState(platform: Platform, userId: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ platform, userId, purpose: 'oauth' }, secret, { expiresIn: '10m' });
}

function verifyOAuthState(state: string): { platform: Platform; userId: number } {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  const payload = jwt.verify(state, secret) as {
    platform: Platform;
    userId: number;
    purpose?: string;
  };
  if (payload.purpose !== 'oauth' || !PLATFORMS.includes(payload.platform)) {
    throw new Error('Invalid OAuth state');
  }
  return { platform: payload.platform, userId: payload.userId };
}

async function exchangeCode(
  platform: Platform,
  code: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
  const config = getOAuthConfig(platform);
  if (!config) throw new Error(`OAuth not configured for ${platform}`);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  });

  if (platform === 'tiktok') {
    body.set('client_key', config.clientId);
    body.set('client_secret', config.clientSecret);
  } else {
    body.set('client_id', config.clientId);
    body.set('client_secret', config.clientSecret);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (config.useBasicAuth) {
    headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
    body.delete('client_secret');
  }

  const res = await fetch(config.tokenUrl, { method: 'POST', headers, body });
  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(
      typeof data.error_description === 'string'
        ? data.error_description
        : typeof data.error === 'string'
          ? data.error
          : `Token exchange failed (${res.status})`,
    );
  }

  let accessToken = String(data.access_token ?? '');
  let refreshToken = data.refresh_token ? String(data.refresh_token) : undefined;
  let expiresIn = typeof data.expires_in === 'number' ? data.expires_in : undefined;

  if (platform === 'instagram' && accessToken) {
    const longLived = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          fb_exchange_token: accessToken,
        }),
    );
    const longData = (await longLived.json()) as Record<string, unknown>;
    if (longLived.ok && longData.access_token) {
      accessToken = String(longData.access_token);
      expiresIn = typeof longData.expires_in === 'number' ? longData.expires_in : expiresIn;
    }
  }

  if (platform === 'tiktok' && data.data && typeof data.data === 'object') {
    const tiktokData = data.data as Record<string, unknown>;
    accessToken = String(tiktokData.access_token ?? accessToken);
    refreshToken = tiktokData.refresh_token ? String(tiktokData.refresh_token) : refreshToken;
    expiresIn = typeof tiktokData.expires_in === 'number' ? tiktokData.expires_in : expiresIn;
  }

  if (!accessToken) throw new Error('No access token received');

  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;
  return { accessToken, refreshToken, expiresAt };
}

export const oauthService = {
  isConfigured(platform: Platform): boolean {
    return getOAuthConfig(platform) !== null;
  },

  getAuthorizationUrl(platform: Platform, userId: number): string {
    const config = getOAuthConfig(platform);
    if (!config) throw new Error(`OAuth credentials missing for ${platform}`);

    const state = signOAuthState(platform, userId);
    const scopeSep = platform === 'youtube' || platform === 'spotify' ? ' ' : ',';
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(scopeSep),
      state,
    });

    if (platform === 'tiktok') {
      params.set('client_key', config.clientId);
      params.delete('client_id');
    }

    if (config.extraAuthParams) {
      for (const [k, v] of Object.entries(config.extraAuthParams)) {
        params.set(k, v);
      }
    }

    return `${config.authUrl}?${params}`;
  },

  async handleCallback(
    platform: Platform,
    code: string,
    state: string,
  ): Promise<{ platform: Platform }> {
    verifyOAuthState(state);
    const tokens = await exchangeCode(platform, code);
    await upsertPlatformToken(platform, tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
    return { platform };
  },

  async getConnections() {
    const tokens = await prisma.platformToken.findMany();
    const tokenMap = new Map(tokens.map((t) => [t.platform, t]));

    return Promise.all(
      PLATFORMS.map(async (platform) => {
        const token = tokenMap.get(platform);
        const lastStat = await prisma.platformStat.findFirst({
          where: { platform },
          orderBy: { recordedAt: 'desc' },
        });

        return {
          platform,
          connected: !!token,
          oauthConfigured: this.isConfigured(platform),
          expiresAt: token?.expiresAt?.toISOString() ?? null,
          lastSync: lastStat?.recordedAt.toISOString() ?? token?.lastSyncAt?.toISOString() ?? null,
          lastSyncError: token?.lastSyncError ?? null,
          updatedAt: token?.updatedAt.toISOString() ?? null,
        };
      }),
    );
  },

  async disconnect(platform: Platform): Promise<void> {
    await prisma.platformToken.deleteMany({ where: { platform } });
  },

  getFrontendRedirect(status: 'success' | 'error', platform: Platform, message?: string): string {
    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    const params = new URLSearchParams({ status, platform });
    if (message) params.set('message', message);
    return `${base}/integrations?${params}`;
  },
};
