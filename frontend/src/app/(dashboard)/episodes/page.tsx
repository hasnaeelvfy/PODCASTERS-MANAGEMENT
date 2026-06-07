'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mic2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { api } from '@/lib/api';
import { calcReach, formatNumber, LANGUAGE_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Episode } from '@/types';

function statusBadge(position?: number) {
  if (position === 6) {
    return { label: 'Publié', className: 'badge-success' };
  }
  if (position === 5) {
    return { label: 'Enregistré', className: 'badge-blue' };
  }
  return { label: 'Brouillon', className: 'badge-muted' };
}

export default function EpisodesPage() {
  const { data: episodes = [], isLoading } = useQuery({
    queryKey: ['episodes'],
    queryFn: () => api.episodes.list(),
  });

  const published = episodes.filter(
    (ep) => ep.guest?.stage?.position === 5 || ep.guest?.stage?.position === 6,
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
      <TopBar title="Épisodes" />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : published.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center">
          <div className="w-14 h-14 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-hover)] flex items-center justify-center mb-5">
            <Mic2 size={24} className="text-gold" />
          </div>
          <h3 className="text-sm font-black tracking-tight uppercase text-[var(--text-primary)] mb-2">
            Aucun épisode
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-6">
            Les épisodes enregistrés ou publiés apparaîtront ici avec leurs métriques.
          </p>
          <Link href="/pipeline" className="btn-primary">
            Voir le pipeline
          </Link>
        </div>
      ) : (
        <div className="space-y-3 overflow-hidden">
          {published
            .sort((a, b) => (a.episodeNumber || 999) - (b.episodeNumber || 999))
            .map((ep: Episode) => {
              const g = ep.guest!;
              const reach = calcReach(ep);
              const rev = (ep.sponsors || []).reduce((s, x) => s + Number(x.amount), 0);
              const badge = statusBadge(g.stage?.position);

              return (
                <Link key={ep.id} href={`/guests/${g.id}`} className="block overflow-hidden">
                  <div className="card card-hover flex items-center gap-5 p-5">
                    <span className="text-lg md:text-3xl font-black text-[var(--text-dimmed)] w-10 shrink-0 text-center">
                      {ep.episodeNumber != null ? ep.episodeNumber : '—'}
                    </span>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="text-sm font-black text-[var(--text-primary)]">
                        {ep.title || `${g.firstName} ${g.lastName}`}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-3">
                        {g.company}
                        {g.language ? ` · ${LANGUAGE_LABELS[g.language]}` : ''}
                        {reach > 0 ? ` · ${formatNumber(reach)} vues` : ''}
                      </p>
                    </div>
                    <span className={cn('badge shrink-0', badge.className)}>
                      {badge.label}
                    </span>
                    {rev > 0 && (
                      <span className="hidden sm:block text-xs text-blue font-semibold tabular-nums shrink-0">
                        {formatNumber(rev)} MAD
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
        </div>
      )}
    </motion.div>
  );
}
