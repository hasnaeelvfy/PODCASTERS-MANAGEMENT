import { prisma } from '../lib/prisma';

const SHORT_PLATFORM_MAP = {
  tiktok: 'tiktok',
  instagram: 'instagram',
} as const;

type DashboardPlatform = 'youtube' | 'spotify' | 'tiktok' | 'instagram';

function episodeTitle(ep: {
  title?: string | null;
  episodeNumber?: number | null;
  guest: { firstName: string; lastName: string };
}): string {
  return ep.title || `${ep.guest.firstName} ${ep.guest.lastName}`.trim();
}

export async function getDashboardStats() {
  const [guests, episodes, sponsors] = await Promise.all([
    prisma.guest.count(),
    prisma.episode.findMany({
      include: { guest: true, shorts: true, sponsors: true },
    }),
    prisma.sponsor.findMany(),
  ]);

  let revenue = 0;
  for (const sp of sponsors) revenue += Number(sp.amount);

  const topEpisodesByPlatform: Record<
    DashboardPlatform,
    { id: number; title: string; episodeNumber?: number | null; value: number; metricLabel: string }[]
  > = {
    youtube: [],
    spotify: [],
    tiktok: [],
    instagram: [],
  };

  const youtubeCandidates = episodes
    .map((ep) => ({
      id: ep.id,
      title: episodeTitle(ep),
      episodeNumber: ep.episodeNumber,
      value: ep.views,
      metricLabel: 'vues',
    }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  topEpisodesByPlatform.youtube = youtubeCandidates;

  const spotifyCandidates = episodes
    .map((ep) => ({
      id: ep.id,
      title: episodeTitle(ep),
      episodeNumber: ep.episodeNumber,
      value: ep.listens,
      metricLabel: 'écoutes',
    }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  topEpisodesByPlatform.spotify = spotifyCandidates;

  for (const [platform, shortKey] of Object.entries(SHORT_PLATFORM_MAP) as [
    DashboardPlatform,
    keyof typeof SHORT_PLATFORM_MAP,
  ][]) {
    const candidates = episodes
      .map((ep) => {
        const value = ep.shorts
          .filter((s) => s.platform === shortKey)
          .reduce((sum, s) => sum + s.views, 0);
        return {
          id: ep.id,
          title: episodeTitle(ep),
          episodeNumber: ep.episodeNumber,
          value,
          metricLabel: 'vues',
        };
      })
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    topEpisodesByPlatform[platform] = candidates;
  }

  const now = new Date();
  const revenueByMonth: { month: string; revenue: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    let monthRevenue = 0;
    for (const sp of sponsors) {
      const ep = episodes.find((e) => e.id === sp.episodeId);
      const pub = ep?.publicationDate;
      if (pub && pub >= monthStart && pub <= monthEnd) {
        monthRevenue += Number(sp.amount);
      }
    }
    revenueByMonth.push({ month: label, revenue: monthRevenue });
  }

  return {
    stats: {
      totalGuests: guests,
      revenue,
      growthRate: 0,
    },
    topEpisodesByPlatform,
    revenueEvolution: revenueByMonth,
  };
}
