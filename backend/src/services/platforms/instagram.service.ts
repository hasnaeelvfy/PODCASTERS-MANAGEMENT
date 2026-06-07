import type { PlatformFetcher, PlatformFetchResult } from './types';

export class InstagramService implements PlatformFetcher {
  platform = 'instagram' as const;

  async fetchMetrics(accessToken: string): Promise<PlatformFetchResult> {
    const igUserId = process.env.INSTAGRAM_USER_ID;
    if (!igUserId) return { metrics: [], error: 'INSTAGRAM_USER_ID non configuré dans .env' };

    const fields = 'followers_count,media_count,impressions,reach,profile_views';
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/insights?metric=${fields}&period=day&access_token=${accessToken}`,
    );

    if (!res.ok) {
      const text = await res.text();
      return { metrics: [], error: `Instagram API erreur ${res.status}: ${text.slice(0, 200)}` };
    }

    const body = (await res.json()) as {
      data?: { name: string; values: { value: number }[] }[];
    };

    const metrics = (body.data ?? []).map((item) => ({
      metricKey: item.name,
      metricValue: item.values?.[0]?.value ?? 0,
    }));

    return { metrics, error: metrics.length ? undefined : 'Aucune métrique Instagram reçue' };
  }
}
