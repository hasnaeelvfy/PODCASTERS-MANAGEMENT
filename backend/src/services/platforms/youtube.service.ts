import type { PlatformFetcher, PlatformFetchResult, PlatformMetric } from './types';

function parseGoogleError(body: string): string | undefined {
  try {
    const json = JSON.parse(body) as { error?: { message?: string } };
    return json.error?.message;
  } catch {
    return body.slice(0, 200) || undefined;
  }
}

export class YouTubeService implements PlatformFetcher {
  platform = 'youtube' as const;

  async fetchMetrics(accessToken: string): Promise<PlatformFetchResult> {
    const metrics: PlatformMetric[] = [];
    const errors: string[] = [];

    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    const dataUrl = channelId
      ? `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}`
      : 'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true';

    const dataRes = await fetch(dataUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (dataRes.ok) {
      const body = (await dataRes.json()) as {
        items?: { statistics?: Record<string, string> }[];
      };
      const stats = body.items?.[0]?.statistics;
      if (stats) {
        if (stats.viewCount) metrics.push({ metricKey: 'viewCount', metricValue: Number(stats.viewCount) });
        if (stats.subscriberCount)
          metrics.push({ metricKey: 'subscriberCount', metricValue: Number(stats.subscriberCount) });
        if (stats.videoCount) metrics.push({ metricKey: 'videoCount', metricValue: Number(stats.videoCount) });
      }
    } else {
      const err = parseGoogleError(await dataRes.text());
      errors.push(err || `YouTube Data API erreur ${dataRes.status}`);
    }

    const resolvedChannelId = channelId || (await this.resolveChannelId(accessToken));
    if (resolvedChannelId) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 28);

      const params = new URLSearchParams({
        ids: `channel==${resolvedChannelId}`,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        metrics: 'views,estimatedMinutesWatched,subscribersGained',
      });

      const analyticsRes = await fetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (analyticsRes.ok) {
        const body = (await analyticsRes.json()) as {
          rows?: number[][];
          columnHeaders?: { name: string }[];
        };
        if (body.rows?.length && body.columnHeaders?.length) {
          const headers = body.columnHeaders.map((h) => h.name);
          const row = body.rows[0];
          for (let i = 0; i < headers.length; i++) {
            const key = headers[i];
            if (key === 'day') continue;
            const value = Number(row[i] ?? 0);
            if (!Number.isNaN(value)) metrics.push({ metricKey: key, metricValue: value });
          }
        }
      } else {
        const err = parseGoogleError(await analyticsRes.text());
        if (!metrics.length) errors.push(err || `YouTube Analytics API erreur ${analyticsRes.status}`);
      }
    }

    const unique = new Map<string, number>();
    for (const m of metrics) unique.set(m.metricKey, m.metricValue);

    return {
      metrics: [...unique.entries()].map(([metricKey, metricValue]) => ({ metricKey, metricValue })),
      error: unique.size === 0 ? errors[0] : undefined,
    };
  }

  private async resolveChannelId(accessToken: string): Promise<string | null> {
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { items?: { id: string }[] };
    return body.items?.[0]?.id ?? null;
  }
}
