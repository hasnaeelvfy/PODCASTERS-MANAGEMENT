import { prisma } from '../lib/prisma';

type EpisodeWithGuest = Awaited<ReturnType<typeof loadEpisodes>>[number];

async function loadEpisodes() {
  return prisma.episode.findMany({
    include: {
      guest: { include: { stage: true } },
      sponsors: { where: { deletedAt: null } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/** Published = pipeline stage "Publié" (position 6) OR publication date in the past. */
export function isPublishedEpisode(ep: EpisodeWithGuest, now = new Date()): boolean {
  if (ep.guest.stage?.position === 6) return true;
  return Boolean(ep.publicationDate && ep.publicationDate <= now);
}

/** YouTube view count from API (youtube_views column). */
export function episodeViewCount(ep: EpisodeWithGuest): number {
  return ep.youtubeViews || 0;
}

/** Date used for charts / month bucketing. */
export function episodePublicationDate(ep: EpisodeWithGuest, now = new Date()): Date | null {
  if (!isPublishedEpisode(ep, now)) return null;
  if (ep.publicationDate && ep.publicationDate <= now) return ep.publicationDate;
  if (ep.guest.stage?.position === 6) return ep.updatedAt;
  return ep.publicationDate;
}

function episodeTitle(ep: {
  title?: string | null;
  episodeNumber?: number | null;
  guest: { firstName: string; lastName: string };
}): string {
  return ep.title || `${ep.guest.firstName} ${ep.guest.lastName}`.trim();
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getDashboardStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalEpisodes,
    episodes,
    sponsors,
    guests,
    tasks,
    recentGuests,
    recentSponsors,
  ] = await Promise.all([
    prisma.episode.count(),
    loadEpisodes(),
    prisma.sponsor.findMany({ where: { deletedAt: null }, include: { episode: { include: { guest: true } } } }),
    prisma.guest.count(),
    prisma.task.findMany({
      where: { status: { in: ['pending', 'in_progress'] } },
      include: { guest: true, assignee: { select: { fullname: true } } },
      orderBy: { dueDate: 'asc' },
      take: 8,
    }),
    prisma.guest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { stage: true },
    }),
    prisma.sponsor.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'desc' },
      take: 4,
      include: { episode: { include: { guest: true } } },
    }),
  ]);

  const published = episodes.filter((e) => isPublishedEpisode(e, now));
  const publishedEpisodes = published.length;

  const totalYoutubeViews = episodes.reduce((s, e) => s + (e.youtubeViews || 0), 0);
  const totalSpotifyListens = published.reduce((s, e) => s + (e.listens || 0), 0);

  const confirmedRevenue = sponsors
    .filter((s) => s.status === 'confirme' || s.status === 'partenaire_recurrent')
    .reduce((s, sp) => s + Number(sp.amount), 0);
  const activeSponsors = sponsors.filter((s) =>
    ['confirme', 'nego', 'partenaire_recurrent', 'contacte'].includes(s.status),
  ).length;

  const engagementRates = published
    .map((e) => (e.engagementRate ? Number(e.engagementRate) : 0))
    .filter((r) => r > 0);
  const avgEngagement = engagementRates.length
    ? Math.round((engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length) * 10) / 10
    : 0;

  const viewsInRange = (start: Date, end: Date) =>
    published
      .filter((e) => {
        const pub = episodePublicationDate(e);
        return pub && pub >= start && pub <= end;
      })
      .reduce((s, e) => s + episodeViewCount(e), 0);

  const currentMonthViews = viewsInRange(monthStart, now);
  const prevMonthViews = viewsInRange(prevMonthStart, prevMonthEnd);

  const currentMonthRevenue = sponsors
    .filter((s) => {
      const ep = episodes.find((e) => e.id === s.episodeId);
      if (!ep || !isPublishedEpisode(ep, now)) return false;
      const pub = episodePublicationDate(ep);
      return pub && pub >= monthStart;
    })
    .reduce((s, sp) => s + Number(sp.amount), 0);
  const prevMonthRevenue = sponsors
    .filter((s) => {
      const ep = episodes.find((e) => e.id === s.episodeId);
      if (!ep || !isPublishedEpisode(ep, now)) return false;
      const pub = episodePublicationDate(ep);
      return pub && pub >= prevMonthStart && pub <= prevMonthEnd;
    })
    .reduce((s, sp) => s + Number(sp.amount), 0);

  const viewsEvolution: { month: string; views: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    viewsEvolution.push({ month: label, views: viewsInRange(start, end) });
  }

  const revenueEvolution: { month: string; revenue: number; confirmed: number; prospect: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    let revenue = 0;
    let confirmed = 0;
    let prospect = 0;
    for (const sp of sponsors) {
      const ep = episodes.find((e) => e.id === sp.episodeId);
      if (!ep || !isPublishedEpisode(ep, now)) continue;
      const pub = episodePublicationDate(ep);
      if (pub && pub >= start && pub <= end) {
        const amt = Number(sp.amount);
        revenue += amt;
        if (sp.status === 'confirme' || sp.status === 'partenaire_recurrent') confirmed += amt;
        if (sp.status === 'prospect') prospect += amt;
      }
    }
    revenueEvolution.push({ month: label, revenue, confirmed, prospect });
  }

  const recentEpisodes = published
    .map((e) => ({ e, pub: episodePublicationDate(e) }))
    .filter((x) => x.pub)
    .sort((a, b) => (b.pub?.getTime() || 0) - (a.pub?.getTime() || 0))
    .slice(0, 5)
    .map(({ e, pub }) => ({
      id: e.id,
      guestId: e.guestId,
      title: episodeTitle(e),
      views: episodeViewCount(e),
      listens: e.listens,
      publicationDate: pub,
      youtubeEpisodeUrl: e.youtubeEpisodeUrl,
    }));

  const topEpisodes = [...published]
    .map((e) => ({
      id: e.id,
      title: episodeTitle(e),
      episodeNumber: e.episodeNumber,
      youtubeViews: episodeViewCount(e),
      spotifyListens: e.listens,
    }))
    .sort((a, b) => b.youtubeViews - a.youtubeViews)
    .slice(0, 10);

  const upcomingEvents: { date: string; type: 'shooting' | 'publication'; label: string; guestId: number }[] = [];
  const allGuests = await prisma.guest.findMany({
    where: { shootingDate: { gte: now } },
    orderBy: { shootingDate: 'asc' },
    take: 10,
  });
  for (const g of allGuests) {
    if (g.shootingDate) {
      upcomingEvents.push({
        date: g.shootingDate.toISOString(),
        type: 'shooting',
        label: `Tournage — ${g.firstName} ${g.lastName}`,
        guestId: g.id,
      });
    }
  }
  for (const e of episodes) {
    if (e.publicationDate && e.publicationDate >= now && !isPublishedEpisode(e, now)) {
      upcomingEvents.push({
        date: e.publicationDate.toISOString(),
        type: 'publication',
        label: `Publication — ${episodeTitle(e)}`,
        guestId: e.guestId,
      });
    }
  }
  upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const activity: { type: string; label: string; date: string; guestId?: number }[] = [];

  for (const g of recentGuests) {
    activity.push({
      type: 'guest',
      label: `Invité ajouté : ${g.firstName} ${g.lastName}`,
      date: g.createdAt.toISOString(),
      guestId: g.id,
    });
  }
  for (const sp of recentSponsors.slice(0, 3)) {
    activity.push({
      type: 'sponsor',
      label: `Sponsor ${sp.status} : ${sp.name} (${Number(sp.amount)} MAD)`,
      date: new Date().toISOString(),
    });
  }
  for (const e of recentEpisodes.slice(0, 3)) {
    activity.push({
      type: 'episode',
      label: `Épisode publié : ${e.title}`,
      date: e.publicationDate?.toISOString() || new Date().toISOString(),
      guestId: e.guestId,
    });
  }
  activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    kpis: {
      totalEpisodes: { value: totalEpisodes, change: 0 },
      publishedEpisodes: { value: publishedEpisodes, change: 0 },
      totalYoutubeViews: { value: totalYoutubeViews, change: pctChange(currentMonthViews, prevMonthViews) },
      totalSpotifyListens: { value: totalSpotifyListens, change: 0 },
      confirmedRevenue: { value: confirmedRevenue, change: pctChange(currentMonthRevenue, prevMonthRevenue) },
      activeSponsors: { value: activeSponsors, change: 0 },
      avgEngagement: { value: avgEngagement, change: 0 },
      totalGuests: { value: guests, change: 0 },
    },
    viewsEvolution,
    revenueEvolution,
    recentEpisodes,
    recentSponsors: recentSponsors.map((s) => ({
      id: s.id,
      name: s.name,
      amount: Number(s.amount),
      status: s.status,
      episodeTitle: s.episode ? episodeTitle(s.episode) : '',
    })),
    topEpisodes,
    upcomingEvents: upcomingEvents.slice(0, 12),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      guestName: `${t.guest.firstName} ${t.guest.lastName}`,
      assignee: t.assignee?.fullname,
    })),
    activity: activity.slice(0, 10),
    stats: {
      totalGuests: guests,
      revenue: confirmedRevenue,
      growthRate: pctChange(currentMonthViews, prevMonthViews),
    },
    topEpisodesByPlatform: {
      youtube: topEpisodes.slice(0, 3).map((e) => ({
        id: e.id,
        title: e.title,
        episodeNumber: e.episodeNumber,
        value: e.youtubeViews,
        metricLabel: 'vues',
      })),
      spotify: topEpisodes
        .filter((e) => e.spotifyListens > 0)
        .sort((a, b) => b.spotifyListens - a.spotifyListens)
        .slice(0, 3)
        .map((e) => ({
          id: e.id,
          title: e.title,
          episodeNumber: e.episodeNumber,
          value: e.spotifyListens,
          metricLabel: 'écoutes',
        })),
    },
    revenueEvolutionLegacy: revenueEvolution.map((r) => ({ month: r.month, revenue: r.revenue })),
  };
}
