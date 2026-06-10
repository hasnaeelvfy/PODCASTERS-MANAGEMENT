'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, DollarSign, Radio, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

export function SponsoringWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['sponsor-contract-dashboard'],
    queryFn: () => api.sponsorContracts.dashboardStats(),
  });

  if (isLoading) {
    return <div className="glass-panel p-4 skeleton h-32" />;
  }

  if (!data) return null;

  const revenueChange = data.prevMonthRevenue
    ? Math.round(((data.monthRevenue - data.prevMonthRevenue) / data.prevMonthRevenue) * 100)
    : 0;

  return (
    <div className="glass-panel p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Sponsoring</h3>
        <Link href="/sponsors" className="text-[10px] text-violet-400 hover:underline">Voir tout</Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Radio className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Actifs</span>
          </div>
          <p className="text-xl font-bold tabular-nums">{data.activeContracts}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Ce mois</span>
          </div>
          <p className="text-xl font-bold tabular-nums">{formatNumber(data.monthRevenue)}</p>
          {revenueChange !== 0 && (
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{revenueChange > 0 ? '+' : ''}{revenueChange}% vs mois préc.</p>
          )}
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Expirent (30j)</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-amber-300">{data.expiringWithin30Days}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Queue YT</span>
          </div>
          <p className="text-xl font-bold tabular-nums">{data.pendingYoutubeQueue}</p>
        </div>
      </div>
    </div>
  );
}
