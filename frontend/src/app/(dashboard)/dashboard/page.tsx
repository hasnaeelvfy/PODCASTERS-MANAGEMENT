'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mic2, Eye, DollarSign, Users, TrendingUp, Star, CheckCircle,
  Calendar, ListTodo, Activity, Search, Headphones,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { TopBar } from '@/components/layout/TopBar';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCarousel } from '@/components/dashboard/ChartCarousel';
import { KpiCardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { EmptySearchState } from '@/components/ui/EmptySearchState';
import { api } from '@/lib/api';
import { useSearch } from '@/contexts/SearchContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { formatNumber, initials, SPONSOR_STATUS_LABELS, youtubeThumbnailUrl } from '@/lib/utils';
import type { PremiumDashboard } from '@/types';

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    prospect: 'badge-muted',
    contacte: 'badge-blue',
    nego: 'badge-gold',
    confirme: 'badge-success',
    refuse: 'badge-danger',
    partenaire_recurrent: 'badge-violet',
  };
  return map[status] || 'badge-muted';
}

function truncateLabel(label: string, max: number) {
  return label.length > max ? `${label.slice(0, max)}…` : label;
}

export default function DashboardPage() {
  const { query, hasQuery } = useSearch();
  const isMobile = useIsMobile();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard.stats() as Promise<PremiumDashboard>,
  });

  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['guests', 'search', query],
    queryFn: () => api.guests.list({ search: query }),
    enabled: hasQuery,
  });

  const topEpisodes = data?.topEpisodes ?? [];

  const topEpisodesChartData = useMemo(
    () =>
      topEpisodes.map((ep) => ({
        ...ep,
        shortTitle: truncateLabel(ep.title, isMobile ? 12 : 22),
      })),
    [topEpisodes, isMobile],
  );

  const topChartHeight = Math.min(
    isMobile ? 280 : 360,
    Math.max(isMobile ? 180 : 240, topEpisodesChartData.length * (isMobile ? 40 : 48) + 48),
  );

  const yAxisWidth = isMobile ? 76 : 120;

  if (hasQuery) {
    return (
      <div className="min-w-0">
        <TopBar title="Dashboard" />
        {searchLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <KpiCardSkeleton key={i} />)}</div>
        ) : searchResults.length === 0 ? (
          <EmptySearchState query={query} entityLabel="invité" />
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-muted)] mb-4 flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
            </p>
            {searchResults.map((g, i) => (
              <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/guests/${g.id}`} className="card card-hover p-4 flex items-center gap-4 block">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: `${g.stage?.color}22`, color: g.stage?.color }}>
                    {initials(g.firstName, g.lastName)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{g.firstName} {g.lastName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{g.company} · {g.stage?.name}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div>
        <TopBar title="Dashboard" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartSkeleton /><ChartSkeleton />
        </div>
      </div>
    );
  }

  const { kpis, viewsEvolution, revenueEvolution, recentEpisodes, recentSponsors, upcomingEvents, tasks, activity } = data;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 overflow-x-hidden space-y-6">
      <TopBar title="Dashboard" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-3">
        {isMobile ? (
          <>
            <KpiCard compact label="Revenus" value={`${formatNumber(kpis.confirmedRevenue.value)}`} change={kpis.confirmedRevenue.change} icon={DollarSign} accent="green" delay={0} />
            <KpiCard compact label="Épisodes" value={kpis.publishedEpisodes.value} icon={Mic2} accent="purple" delay={0.05} />
            <KpiCard compact label="Vues" value={formatNumber(kpis.totalYoutubeViews.value)} change={kpis.totalYoutubeViews.change} icon={Eye} accent="blue" delay={0.1} />
            <KpiCard compact label="Écoutes" value={formatNumber(kpis.totalSpotifyListens?.value ?? 0)} icon={Headphones} accent="pink" delay={0.15} />
          </>
        ) : (
          <>
            <KpiCard label="Épisodes" value={kpis.totalEpisodes.value} icon={Mic2} accent="purple" delay={0} />
            <KpiCard label="Publiés" value={kpis.publishedEpisodes.value} icon={CheckCircle} accent="green" delay={0.05} />
            <KpiCard label="Vues YouTube" value={formatNumber(kpis.totalYoutubeViews.value)} change={kpis.totalYoutubeViews.change} icon={Eye} accent="blue" delay={0.1} />
            <KpiCard label="Revenus (MAD)" value={formatNumber(kpis.confirmedRevenue.value)} change={kpis.confirmedRevenue.change} icon={DollarSign} accent="green" delay={0.15} />
            <KpiCard label="Sponsors actifs" value={kpis.activeSponsors.value} icon={Users} accent="pink" delay={0.2} />
            <KpiCard label="Engagement %" value={`${kpis.avgEngagement.value}%`} icon={TrendingUp} accent="orange" delay={0.25} />
          </>
        )}
      </div>

      {/* Charts */}
      <ChartCarousel>
        <div className="glass-panel p-4 sm:p-5 min-w-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Évolution des vues YouTube</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
            <LineChart data={viewsEvolution}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: isMobile ? 9 : 10 }} />
              <YAxis tick={{ fontSize: isMobile ? 9 : 10 }} width={isMobile ? 36 : 48} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="views" stroke="#8B5CF6" strokeWidth={2} dot={false} fill="url(#viewsGrad)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel p-4 sm:p-5 min-w-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Revenus sponsors</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
            <BarChart data={revenueEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: isMobile ? 9 : 10 }} />
              <YAxis tick={{ fontSize: isMobile ? 9 : 10 }} width={isMobile ? 36 : 48} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
              <Bar dataKey="confirmed" name="Confirmé" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="prospect" name="Prospect" fill="#6B7280" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCarousel>

      {/* Recent episodes + sponsors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Mic2 className="w-4 h-4 text-violet-400" /> Derniers épisodes</h3>
          <div className="space-y-2">
            {recentEpisodes.length === 0 && <p className="text-sm text-[var(--text-muted)]">Aucun épisode publié.</p>}
            {recentEpisodes.map((ep) => {
              const thumb = youtubeThumbnailUrl(ep.youtubeEpisodeUrl);
              return (
                <Link
                  key={ep.id}
                  href={`/guests/${ep.guestId}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors min-h-[64px]"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--bg-hover)] shrink-0 flex items-center justify-center border border-[var(--border-subtle)]">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Mic2 className="w-5 h-5 text-violet-400/60" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{ep.title}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {ep.publicationDate ? new Date(ep.publicationDate).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-violet-300 tabular-nums">{formatNumber(ep.views)}</p>
                    <p className="text-[10px] text-[var(--text-dimmed)]">vues</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-emerald-400" /> Sponsors récents</h3>
          <div className="space-y-2">
            {recentSponsors.length === 0 && <p className="text-sm text-[var(--text-muted)]">Aucun sponsor.</p>}
            {recentSponsors.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.03]">
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  <span className={`badge text-[9px] ${statusBadgeClass(s.status)}`}>
                    {SPONSOR_STATUS_LABELS[s.status] || s.status}
                  </span>
                </div>
                <span className="text-sm font-mono text-emerald-400 tabular-nums">{formatNumber(s.amount)} MAD</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: calendar, tasks, activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-violet-400" /> Calendrier éditorial</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {upcomingEvents.length === 0 && <p className="text-xs text-[var(--text-muted)]">Aucun événement à venir.</p>}
            {upcomingEvents.map((ev, i) => (
              <Link key={i} href={`/guests/${ev.guestId}`} className="block p-2 rounded-lg border border-violet-500/10 hover:border-violet-500/30 transition-colors">
                <p className="text-xs font-semibold text-violet-300">{ev.type === 'shooting' ? '🎬' : '📡'} {ev.label}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{new Date(ev.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><ListTodo className="w-4 h-4 text-blue-400" /> Tâches en cours</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {tasks.length === 0 && <p className="text-xs text-[var(--text-muted)]">Aucune tâche en cours.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="p-2 rounded-lg bg-white/[0.02]">
                <p className="text-xs font-semibold">{t.title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{t.guestName}{t.dueDate ? ` · ${new Date(t.dueDate).toLocaleDateString('fr-FR')}` : ''}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-pink-400" /> Activité récente</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-[var(--text-dimmed)] shrink-0">{new Date(a.date).toLocaleDateString('fr-FR')}</span>
                <span className="text-[var(--text-secondary)]">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top episodes bar chart */}
      <div className="glass-panel p-4 sm:p-5 overflow-hidden min-w-0">
        <h3 className="text-sm font-bold mb-3 sm:mb-4">Top 10 épisodes par performance</h3>
        <div className="w-full min-w-0 mx-auto">
          <ResponsiveContainer width="100%" height={topChartHeight} debounce={50}>
            <BarChart
              data={topEpisodesChartData}
              layout="vertical"
              margin={{
                top: 4,
                right: isMobile ? 4 : 12,
                left: isMobile ? 0 : 4,
                bottom: isMobile ? 20 : 8,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: isMobile ? 9 : 10 }} />
              <YAxis
                type="category"
                dataKey="shortTitle"
                tick={{ fontSize: isMobile ? 9 : 10 }}
                width={yAxisWidth}
                interval={0}
              />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: isMobile ? 11 : 12,
                }}
                formatter={(value: number, name: string) => [formatNumber(value), name]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.title ?? ''
                }
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{
                  fontSize: isMobile ? 10 : 12,
                  paddingTop: isMobile ? 4 : 8,
                }}
              />
              <Bar dataKey="youtubeViews" name="Vues YouTube" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="spotifyListens" name="Écoutes Spotify" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
