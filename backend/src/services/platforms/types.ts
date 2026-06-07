import type { Platform } from '@prisma/client';

export interface PlatformMetric {
  metricKey: string;
  metricValue: number;
}

export interface PlatformFetchResult {
  metrics: PlatformMetric[];
  error?: string;
}

export interface PlatformFetcher {
  platform: Platform;
  fetchMetrics(accessToken: string): Promise<PlatformFetchResult>;
}
