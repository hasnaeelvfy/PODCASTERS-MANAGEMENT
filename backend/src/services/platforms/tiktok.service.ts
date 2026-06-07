import type { PlatformFetcher, PlatformFetchResult } from './types';

export class TikTokService implements PlatformFetcher {
  platform = 'tiktok' as const;

  async fetchMetrics(accessToken: string): Promise<PlatformFetchResult> {
    const res = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count,likes_count,video_count',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) {
      const text = await res.text();
      return { metrics: [], error: `TikTok API erreur ${res.status}: ${text.slice(0, 200)}` };
    }

    const body = (await res.json()) as {
      data?: { user?: Record<string, number> };
    };
    const user = body.data?.user;
    if (!user) return { metrics: [], error: 'Réponse TikTok vide' };

    return {
      metrics: [
        { metricKey: 'follower_count', metricValue: user.follower_count ?? 0 },
        { metricKey: 'likes_count', metricValue: user.likes_count ?? 0 },
        { metricKey: 'video_count', metricValue: user.video_count ?? 0 },
      ],
    };
  }
}
