'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, DollarSign, TrendingUp } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { StatCard } from '@/components/ui/StatCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { PlatformAnalytics } from '@/components/dashboard/PlatformAnalytics';
import { PlatformGrowthCharts } from '@/components/dashboard/PlatformGrowthCharts';
import { TopEpisodesByPlatform } from '@/components/dashboard/TopEpisodesByPlatform';
import { api } from '@/lib/api';

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-48" />
        ))}
      </div>
      <div className="skeleton h-[360px]" />
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard.stats(),
  });

  const { data: analytics } = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: () => api.analytics.platforms(),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div>
        <TopBar title="Dashboard" />
        <DashboardSkeleton />
      </div>
    );
  }

  const { stats } = data;
  const growthRate = analytics?.overallGrowthRate ?? stats.growthRate;

  return (
    <div className="min-w-0">
      <TopBar title="Dashboard" />

      {/* 01 — VUE D'ENSEMBLE */}
      <div className="section-divider">
        <span className="section-number">01</span>
        <span className="section-divider-label">Vue d'ensemble</span>
        <div className="section-divider-line" />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 mb-5">
        <StatCard label="Invités" value={stats.totalGuests} icon={Users} accent="gold" />
        <StatCard
          label="Revenus"
          value={`${stats.revenue.toLocaleString('fr')} MAD`}
          icon={DollarSign}
          accent="green"
        />
        <StatCard
          label="Croissance"
          value={`${growthRate}%`}
          icon={TrendingUp}
          trend={growthRate}
          accent="blue"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* 02 — ANALYTICS */}
      <div className="section-divider">
        <span className="section-number">02</span>
        <span className="section-divider-label">Analytics Plateformes</span>
        <div className="section-divider-line" />
        <a href="/integrations" className="text-[8px] font-bold tracking-[0.1em] uppercase text-[#F5C542] hover:opacity-70 transition-opacity whitespace-nowrap shrink-0">
          Gérer →
        </a>
      </div>

      <PlatformAnalytics />

      {analytics && analytics.platforms.length > 0 && (
        <>
          {/* 03 — CROISSANCE */}
          <div className="section-divider mt-5">
            <span className="section-number">03</span>
            <span className="section-divider-label">Croissance audience</span>
            <div className="section-divider-line" />
          </div>
          <PlatformGrowthCharts platforms={analytics.platforms} />
        </>
      )}

      {/* 04 — TOP ÉPISODES */}
      <div className="section-divider mt-5">
        <span className="section-number">04</span>
        <span className="section-divider-label">Top épisodes</span>
        <div className="section-divider-line" />
      </div>
      <TopEpisodesByPlatform data={data.topEpisodesByPlatform} />

      {/* 05 — REVENUS */}
      <div className="section-divider mt-5">
        <span className="section-number">05</span>
        <span className="section-divider-label">Évolution revenus</span>
        <div className="section-divider-line" />
      </div>
      <RevenueChart data={data.revenueEvolution} />
    </div>
  )
}
