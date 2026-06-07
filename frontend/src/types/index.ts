export interface User {
  id: number;
  fullname: string;
  email: string;
  role: string;
  avatar?: string | null;
}

export interface PipelineStage {
  id: number;
  name: string;
  color: string;
  position: number;
}

export interface Interaction {
  id: number;
  guestId: number;
  note: string;
  createdAt: string;
}

export interface Short {
  id: number;
  episodeId: number;
  platform: string;
  title?: string | null;
  views: number;
  likes: number;
  shares: number;
  url?: string | null;
}

export interface Sponsor {
  id: number;
  episodeId: number;
  name: string;
  sponsorType: string;
  amount: string | number;
  status: string;
  notes?: string | null;
}

export interface Episode {
  id: number;
  guestId: number;
  episodeNumber?: number | null;
  title?: string | null;
  recordingDate?: string | null;
  publicationDate?: string | null;
  spotifyLink?: string | null;
  youtubeLink?: string | null;
  listens: number;
  views: number;
  shares: number;
  completionRate?: string | number | null;
  shorts?: Short[];
  sponsors?: Sponsor[];
  guest?: Guest;
}

export interface Guest {
  id: number;
  firstName: string;
  lastName: string;
  company?: string | null;
  sector?: string | null;
  city?: string | null;
  source?: string | null;
  contact?: string | null;
  language: string;
  stageId: number;
  shootingDate?: string | null;
  whyElmaakoul?: string | null;
  emotionalAngle?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  stage?: PipelineStage;
  episode?: Episode | null;
  interactions?: Interaction[];
  _count?: { interactions: number };
}

export interface PlatformConnection {
  platform: string;
  connected: boolean;
  oauthConfigured: boolean;
  expiresAt: string | null;
  lastSync: string | null;
  lastSyncError: string | null;
  updatedAt: string | null;
}

export interface PlatformConnectionsResponse {
  connections: PlatformConnection[];
}

export interface PlatformAnalyticsResponse {
  platforms: {
    platform: string;
    metrics: { key: string; label: string; value: number; recordedAt: string }[];
    currentAudience: number;
    audienceGrowth: { month: string; value: number }[];
    growthRate: number;
    lastSync: string | null;
    connected: boolean;
    hasData: boolean;
    syncError: string | null;
  }[];
  overallGrowthRate: number;
  syncing: boolean;
  syncedAt: string;
}

export interface TopEpisodeByPlatform {
  id: number;
  title: string;
  episodeNumber?: number | null;
  value: number;
  metricLabel: string;
}

export interface DashboardStats {
  stats: {
    totalGuests: number;
    revenue: number;
    growthRate: number;
  };
  topEpisodesByPlatform: {
    youtube: TopEpisodeByPlatform[];
    spotify: TopEpisodeByPlatform[];
    tiktok: TopEpisodeByPlatform[];
    instagram: TopEpisodeByPlatform[];
  };
  revenueEvolution: { month: string; revenue: number }[];
}
