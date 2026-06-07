'use client';

import { Youtube, Music, Music2, Instagram, Mic2 } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatNumber } from '@/lib/utils';
import type { DashboardStats } from '@/types';

const PLATFORM_META = {
  youtube: { label: 'YouTube', icon: Youtube, accent: 'text-red-400' },
  spotify: { label: 'Spotify', icon: Music, accent: 'text-emerald-400' },
  tiktok: { label: 'TikTok', icon: Music2, accent: 'text-white' },
  instagram: { label: 'Instagram', icon: Instagram, accent: 'text-pink-400' },
} as const;

export function TopEpisodesByPlatform({
  data,
}: {
  data: DashboardStats['topEpisodesByPlatform'];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-6 sm:mb-8">
      {(Object.keys(PLATFORM_META) as (keyof typeof PLATFORM_META)[]).map((platform) => {
        const meta = PLATFORM_META[platform];
        const Icon = meta.icon;
        const episodes = data[platform] ?? [];

        return (
          <GlowCard key={platform} className="!p-4 sm:!p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-[10px] bg-[var(--bg-hover)] border border-[var(--border-subtle)] flex items-center justify-center">
                <Icon className={`w-5 h-5 ${meta.accent}`} />
              </div>
              <div>
                <h3 className="section-title">Top 3 · {meta.label}</h3>
                <p className="section-subtitle">Épisodes les plus performants</p>
              </div>
            </div>
            <div className="space-y-2">
              {episodes.length === 0 ? (
                <div className="py-6 text-center">
                  <Mic2 className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-muted)]">Aucune donnée pour cette plateforme</p>
                </div>
              ) : (
                episodes.map((ep, i) => (
                  <div
                    key={ep.id}
                    className="flex items-center gap-3 p-3 rounded-[10px] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-200"
                  >
                    <span
                      className={`text-sm font-bold w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                        i === 0
                          ? 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/10 text-cyan-300 border border-cyan-400/20'
                          : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] font-semibold truncate">{ep.title}</p>
                      {ep.episodeNumber != null && (
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Épisode #{ep.episodeNumber}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-cyan-300 tabular-nums">
                        {formatNumber(ep.value)}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase">{ep.metricLabel}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlowCard>
        );
      })}
    </div>
  );
}
