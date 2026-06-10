export interface User {
  id: number;
  fullname: string;
  email: string;
  role: string;
  avatar?: string | null;
}

export interface AppNotification {
  id: number;
  type: string | null;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export interface DashboardTask {
  id: number;
  title: string;
  status: string;
  dueDate: string | null;
  guestName: string;
  assignee: string | null;
}

export interface ActivityLogEntry {
  id: number;
  message: string;
  date: string;
  userId?: number | null;
}

export interface EditorialEvent {
  date: string;
  type: 'shooting' | 'publication';
  label: string;
  guestId: number;
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
  title: string;
  url: string;
  description: string;
  views: number;
  likes: number;
  shares: number;
  publishedAt?: string | null;
}

export interface Sponsor {
  id: number;
  episodeId: number;
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  niche?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  sponsorType: string;
  amount: string | number;
  status: string;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isRecurring?: boolean;
  episode?: Episode;
  contracts?: SponsorContract[];
}

export type ContractType =
  | 'per_episode'
  | 'monthly'
  | 'campaign'
  | 'recurring'
  | 'annual'
  | 'affiliate'
  | 'package';

export type ContractStatus = 'draft' | 'active' | 'paused' | 'expired' | 'cancelled';

export interface SponsorContract {
  id: number;
  sponsorId: number;
  contractType: ContractType;
  crmStatus: string;
  contractStatus: ContractStatus;
  startDate?: string | null;
  endDate?: string | null;
  amount: string | number;
  currency: string;
  commissionRate?: string | number | null;
  promoMessage?: string | null;
  trackingUrl?: string | null;
  discountCode?: string | null;
  youtubeDescriptionTemplate?: string | null;
  autoUpdateYoutube: boolean;
  notes?: string | null;
  sponsor?: Sponsor;
  episodes?: ContractEpisode[];
  _count?: { episodes: number };
}

export interface ContractEpisode {
  id: number;
  contractId: number;
  episodeId: number;
  youtubeVideoId?: string | null;
  youtubeUpdateStatus: string;
  episode?: Episode;
  contract?: SponsorContract;
}

export interface SponsorYoutubeLog {
  id: number;
  contractId?: number | null;
  youtubeVideoId: string;
  action: string;
  success: boolean;
  errorMessage?: string | null;
  createdAt: string;
  contract?: { sponsor?: { name: string } };
}

export interface SponsorConflictDetails {
  contractId: number;
  sponsorId: number;
  sponsorName: string;
  contractType: string;
  contractStatus: string;
  startDate: string | null;
  endDate: string | null;
  episodes: Array<{
    id: number;
    title: string | null;
    episodeNumber: number | null;
    guestName: string | null;
  }>;
}

export interface SponsorDashboardStats {
  activeContracts: number;
  expiringWithin30Days: number;
  pendingYoutubeQueue: number;
  monthRevenue: number;
  prevMonthRevenue: number;
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
  youtubeEpisodeUrl?: string | null;
  spotifyEpisodeUrl?: string | null;
  spotifyPublicationDate?: string | null;
  youtubeVideoId?: string | null;
  youtubeViews?: number;
  youtubeLikes?: number;
  youtubeComments?: number;
  youtubeDuration?: number | null;
  youtubeAvgWatchTime?: number | null;
  lastYoutubeSync?: string | null;
  engagementRate?: string | number | null;
  lastSyncAt?: string | null;
  listens: number;
  views: number;
  shares: number;
  completionRate?: string | number | null;
  shorts?: Short[];
  sponsors?: Sponsor[];
  contractEpisodes?: ContractEpisode[];
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
    tiktok?: TopEpisodeByPlatform[];
    instagram?: TopEpisodeByPlatform[];
  };
  revenueEvolution: { month: string; revenue: number }[];
}

export interface PremiumDashboard {
  kpis: {
    totalEpisodes: { value: number; change: number };
    publishedEpisodes: { value: number; change: number };
    totalYoutubeViews: { value: number; change: number };
    totalSpotifyListens: { value: number; change: number };
    confirmedRevenue: { value: number; change: number };
    activeSponsors: { value: number; change: number };
    avgEngagement: { value: number; change: number };
    totalGuests: { value: number; change: number };
  };
  viewsEvolution: { month: string; views: number }[];
  revenueEvolution: { month: string; revenue: number; confirmed: number; prospect: number }[];
  recentEpisodes: { id: number; guestId: number; title: string; views: number; listens: number; publicationDate: string | null; youtubeEpisodeUrl?: string | null }[];
  recentSponsors: { id: number; name: string; amount: number; status: string; episodeTitle: string }[];
  topEpisodes: { id: number; title: string; episodeNumber?: number | null; youtubeViews: number; spotifyListens: number }[];
  upcomingEvents: { date: string; type: string; label: string; guestId: number }[];
  tasks: { id: number; title: string; status: string; dueDate: string | null; guestName: string; assignee?: string }[];
  activity: { type: string; label: string; date: string; guestId?: number }[];
  stats: DashboardStats['stats'];
  topEpisodesByPlatform: DashboardStats['topEpisodesByPlatform'];
  revenueEvolutionLegacy?: { month: string; revenue: number }[];
}

export interface SponsorStats {
  totalConfirmedRevenue: number;
  activeSponsors: number;
  inNegotiationAmount: number;
  totalSponsors: number;
  byStatus: Record<string, number>;
  topSponsor: { id: number; name: string; amount: number } | null;
}

export interface PaginatedSponsors {
  data: Sponsor[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };
}
