import type { PlatformFetcher, PlatformFetchResult } from './types';

export class SpotifyService implements PlatformFetcher {
  platform = 'spotify' as const;

  async fetchMetrics(accessToken: string): Promise<PlatformFetchResult> {
    const showId = process.env.SPOTIFY_SHOW_ID;
    if (!showId) return { metrics: [], error: 'SPOTIFY_SHOW_ID non configuré dans .env' };

    const res = await fetch(
      `https://generic.wg.spotify.com/podcasters-analytics-api/licensors/${showId}/aggregate`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return { metrics: [], error: `Spotify API erreur ${res.status}: ${text.slice(0, 200)}` };
    }

    const body = (await res.json()) as Record<string, unknown>;
    const metrics = [];

    if (typeof body.starts === 'number') metrics.push({ metricKey: 'starts', metricValue: body.starts });
    if (typeof body.listeners === 'number')
      metrics.push({ metricKey: 'listeners', metricValue: body.listeners });
    if (typeof body.streams === 'number')
      metrics.push({ metricKey: 'streams', metricValue: body.streams });

    return { metrics, error: metrics.length ? undefined : 'Aucune métrique Spotify reçue' };
  }
}
