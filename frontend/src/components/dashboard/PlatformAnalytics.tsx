'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Youtube, Music2, Instagram, Music, Settings2 } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { api } from '@/lib/api';
import type { PlatformAnalyticsResponse } from '@/types';

const PLATFORM_META: Record<
  string,
  { label: string; icon: typeof Youtube; accent: string }
> = {
  youtube: { label: 'YouTube', icon: Youtube, accent: 'text-red-400' },
};

function PlatformCard({
  platform,
  metrics,
  connected,
  hasData,
  syncing,
  syncError,
  growthRate,
  currentAudience,
}: PlatformAnalyticsResponse['platforms'][number] & { syncing: boolean }) {
  const meta = PLATFORM_META[platform] ?? { label: platform, icon: Music2, accent: 'text-white' };
  const Icon = meta.icon;
  const showSyncMessage = !hasData && (syncing || connected || !connected);

  return (
    <div className="card card-hover p-4 md:p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-hover)]">
            <Icon className={`w-5 h-5 ${meta.accent}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{meta.label}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Statistiques plateforme</p>
          </div>
        </div>
        {connected && (
          <span className="badge badge-connected text-[9px]">
            Connecté
          </span>
        )}
      </div>

      {hasData ? (
        <div className="space-y-0">
          {currentAudience > 0 && (
            <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--border-subtle)]">
              <span className="text-sm text-[var(--text-muted)]">Audience</span>
              <span className="text-sm font-bold text-cyan-300 tabular-nums">
                {formatNumber(currentAudience)}
              </span>
            </div>
          )}
          {growthRate !== 0 && (
            <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--border-subtle)]">
              <span className="text-sm text-[var(--text-muted)]">Croissance</span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  growthRate >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {growthRate >= 0 ? '↑' : '↓'} {Math.abs(growthRate)}%
              </span>
            </div>
          )}
          {metrics.slice(0, 4).map((m, i) => (
            <div
              key={m.key}
              className={`flex items-center justify-between gap-3 py-2.5 ${
                i < Math.min(metrics.length, 4) - 1 ? 'border-b border-[var(--border-subtle)]' : ''
              }`}
            >
              <span className="text-sm text-[var(--text-muted)]">{m.label}</span>
              <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                {formatNumber(m.value)}
              </span>
            </div>
          ))}
        </div>
      ) : syncError ? (
        <div className="py-2 space-y-2">
          <p className="text-sm text-amber-400/90 leading-relaxed">{syncError}</p>
          <Link href="/integrations" className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors font-semibold">
            Vérifier la connexion →
          </Link>
        </div>
      ) : showSyncMessage ? (
        <div className="space-y-3 py-2">
          {syncing && (
            <>
              <div className="skeleton h-4 w-3/4 rounded-lg" />
              <div className="skeleton h-4 w-1/2 rounded-lg" />
            </>
          )}
          <p className="text-sm text-[var(--text-muted)] pt-2">
            {connected
              ? 'Synchronisation en cours... Cliquez « Synchroniser maintenant » dans Intégrations.'
              : 'Connectez ce compte dans Intégrations.'}
          </p>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)] py-2">Aucune donnée disponible.</p>
      )}
    </div>
  );
}

export function PlatformAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: () => api.analytics.platforms(),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.platforms.filter(p => p.platform === 'youtube').map((p) => (
        <PlatformCard key={p.platform} {...p} syncing={data.syncing} />
      ))}
    </div>
  );
}
