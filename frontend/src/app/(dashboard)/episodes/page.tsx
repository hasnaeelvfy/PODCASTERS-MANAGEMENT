'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mic2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { EmptySearchState } from '@/components/ui/EmptySearchState';
import { api } from '@/lib/api';
import { useSearch, matchesSearch } from '@/contexts/SearchContext';
import { formatYoutubeViewsLabel, LANGUAGE_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CONTRACT_TYPE_LABELS, getActiveContractFromEpisode } from '@/lib/sponsor-utils';
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
  const { query, hasQuery } = useSearch();
  const [sponsorFilter, setSponsorFilter] = useState('');
  const [contractTypeFilter, setContractTypeFilter] = useState('');

  const { data: episodes = [], isLoading } = useQuery({
    queryKey: ['episodes'],
    queryFn: () => api.episodes.list(),
  });

  const { data: sponsorsData } = useQuery({
    queryKey: ['sponsors-list-filter'],
    queryFn: () => api.sponsors.list({ limit: 100 }),
  });
  const sponsorOptions = sponsorsData?.data ?? [];

  const published = episodes.filter(
    (ep) => ep.guest?.stage?.position === 5 || ep.guest?.stage?.position === 6,
  );

  const filtered = published
    .filter((ep) => {
      if (!hasQuery) return true;
      const g = ep.guest!;
      return matchesSearch(query, [
        ep.title,
        g.firstName,
        g.lastName,
        g.company,
        `${g.firstName} ${g.lastName}`,
      ]);
    })
    .filter((ep) => {
      if (!sponsorFilter) return true;
      const sponsorId = Number(sponsorFilter);
      const active = getActiveContractFromEpisode(ep);
      return active?.id === sponsorId;
    })
    .filter((ep) => {
      if (!contractTypeFilter) return true;
      const link = ep.contractEpisodes?.find((l) => l.contract?.contractStatus === 'active');
      return link?.contract?.contractType === contractTypeFilter;
    });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
      <TopBar title="Épisodes" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <select
          value={sponsorFilter}
          onChange={(e) => setSponsorFilter(e.target.value)}
          className="input-base h-11 w-full text-sm rounded-xl"
        >
          <option value="">Tous les sponsors</option>
          {sponsorOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.niche ? ` · ${s.niche}` : ''}</option>
          ))}
        </select>
        <select
          value={contractTypeFilter}
          onChange={(e) => setContractTypeFilter(e.target.value)}
          className="input-base h-11 w-full text-sm rounded-xl"
        >
          <option value="">Tous les types de contrat</option>
          {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : hasQuery && filtered.length === 0 ? (
        <EmptySearchState query={query} entityLabel="épisode" />
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
          {filtered
            .sort((a, b) => (a.episodeNumber || 999) - (b.episodeNumber || 999))
            .map((ep: Episode, index) => {
              const g = ep.guest!;
              const viewsLabel = formatYoutubeViewsLabel(ep);
              const badge = statusBadge(g.stage?.position);
              const activeSponsor = getActiveContractFromEpisode(ep);

              return (
                <motion.div
                  key={ep.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Link href={`/guests/${g.id}`} className="block overflow-hidden">
                    <div className="card card-hover flex items-center gap-3 md:gap-5 p-4 md:p-5 group min-h-[72px]">
                      <span className="text-base md:text-3xl font-black text-[var(--text-dimmed)] w-8 md:w-10 shrink-0 text-center group-hover:text-cyan-400/60 transition-colors">
                        {ep.episodeNumber != null ? ep.episodeNumber : '—'}
                      </span>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-black text-[var(--text-primary)] group-hover:text-cyan-100 transition-colors truncate">
                            {ep.title || `${g.firstName} ${g.lastName}`}
                          </p>
                          <span className={cn('badge shrink-0 text-[8px] md:text-[9px]', badge.className)}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 truncate">
                          {g.company}
                          {g.language ? ` · ${LANGUAGE_LABELS[g.language]}` : ''}
                        </p>
                        {activeSponsor && (
                          <span className="inline-block mt-1.5 badge badge-violet text-[8px]">
                            🤝 {activeSponsor.name}
                          </span>
                        )}
                        {viewsLabel && (
                          <p className="mt-1.5 text-[10px] md:text-[11px] text-violet-300 font-semibold tabular-nums">
                            {viewsLabel}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
        </div>
      )}
    </motion.div>
  );
}
