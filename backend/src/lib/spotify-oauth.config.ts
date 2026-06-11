/** Canonical Spotify OAuth callback path — must match Spotify Developer Dashboard exactly. */
export const SPOTIFY_OAUTH_CALLBACK_PATH = '/api/analytics/oauth/spotify/callback';

export const SPOTIFY_OAUTH_DEFAULT_REDIRECT_URI =
  'http://127.0.0.1:4000/api/analytics/oauth/spotify/callback';

/** Wrong path sometimes seen when /oauth/ segment is omitted. */
export const SPOTIFY_OAUTH_LEGACY_CALLBACK_PATH = '/api/analytics/spotify/callback';

export function normalizeRedirectUri(uri: string): string {
  return uri.trim().replace(/\/$/, '');
}

/**
 * Single source of truth for the Spotify OAuth redirect_uri.
 * Reads SPOTIFY_REDIRECT_URI from .env but always forces the canonical pathname.
 */
export function getSpotifyRedirectUri(): string {
  const raw = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (!raw) {
    return SPOTIFY_OAUTH_DEFAULT_REDIRECT_URI;
  }

  const normalized = normalizeRedirectUri(raw);

  if (normalized.endsWith(SPOTIFY_OAUTH_CALLBACK_PATH)) {
    return normalized;
  }

  if (
    normalized.endsWith(SPOTIFY_OAUTH_LEGACY_CALLBACK_PATH) ||
    normalized.includes('/api/analytics/spotify/callback')
  ) {
    console.warn(
      `[Spotify OAuth] SPOTIFY_REDIRECT_URI sans segment /oauth/ détecté (${normalized}) — correction vers ${SPOTIFY_OAUTH_DEFAULT_REDIRECT_URI}`,
    );
    return SPOTIFY_OAUTH_DEFAULT_REDIRECT_URI;
  }

  try {
    const url = new URL(normalized);
    const fixed = normalizeRedirectUri(
      `${url.protocol}//${url.host}${SPOTIFY_OAUTH_CALLBACK_PATH}`,
    );
    if (fixed !== normalized) {
      console.warn(
        `[Spotify OAuth] SPOTIFY_REDIRECT_URI pathname incorrect (${normalized}) — utilisation de ${fixed}`,
      );
    }
    return fixed;
  } catch {
    console.warn(
      `[Spotify OAuth] SPOTIFY_REDIRECT_URI invalide (${normalized}) — utilisation de ${SPOTIFY_OAUTH_DEFAULT_REDIRECT_URI}`,
    );
    return SPOTIFY_OAUTH_DEFAULT_REDIRECT_URI;
  }
}
