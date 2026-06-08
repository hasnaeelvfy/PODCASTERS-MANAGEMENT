'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import { GuestCard } from './GuestCard';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSearch, matchesSearch } from '@/contexts/SearchContext';
import { EmptySearchState } from '@/components/ui/EmptySearchState';
import { usePermissions } from '@/hooks/usePermissions';
import type { Guest, PipelineStage } from '@/types';

function PipelineSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="min-w-[220px] space-y-2">
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

export function PipelineBoard() {
  const { canCreate } = usePermissions();
  const [filter, setFilter] = useState<number | 'all'>('all');
  const { query, hasQuery } = useSearch();

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests'],
    queryFn: () => api.guests.list(),
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['stages'],
    queryFn: () => api.guests.stages(),
  });

  const searchFiltered = hasQuery
    ? guests.filter((g) =>
        matchesSearch(query, [
          g.firstName,
          g.lastName,
          g.company,
          g.sector,
          g.city,
          `${g.firstName} ${g.lastName}`,
        ]),
      )
    : guests;

  const filtered =
    filter === 'all' ? searchFiltered : searchFiltered.filter((g) => g.stageId === filter);

  const byStage = (stageId: number) => searchFiltered.filter((g) => g.stageId === stageId);

  if (isLoading) return <PipelineSkeleton />;

  if (hasQuery && searchFiltered.length === 0) {
    return <EmptySearchState query={query} entityLabel="invité" />;
  }

  if (guests.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Users className="w-6 h-6 text-brand-blue" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Pipeline vide</h3>
        <p className="text-sm text-[var(--text-muted)] max-w-sm mb-6">
          Ajoutez votre premier invité pour démarrer votre studio podcast.
        </p>
        {canCreate && (
        <Link
          href="/guests/new"
          className="inline-flex items-center rounded-[4px] px-4 py-3 text-sm font-semibold max-w-fit text-black min-h-[44px] transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent-gold)' }}
        >
          + Premier invité
        </Link>
        )}
      </div>
    );
  }

  const tabClass = (active: boolean) =>
    active
      ? 'shrink-0 rounded-[4px] px-4 py-2 text-[10px] font-bold tracking-[0.1em] uppercase bg-gold text-black border-gold'
      : 'shrink-0 rounded-[4px] px-4 py-2 text-[10px] font-bold tracking-[0.1em] uppercase border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent-primary)]/30 hover:text-[var(--accent-primary)]/70 transition-all';

  return (
    <div className="overflow-hidden">
      {/* FILTER TABS */}
      <div className="flex overflow-x-auto gap-1.5 pb-2.5 mb-3 hide-scroll">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'shrink-0 px-2.5 py-1.5 rounded-[3px] text-[9px] font-bold tracking-[0.1em] uppercase transition-all',
            filter === 'all'
              ? 'bg-[#F5C542] text-black'
              : 'border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]'
          )}
        >
          Tous ({searchFiltered.length})
        </button>
        {stages.map((s: PipelineStage) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id)}
            className={cn(
              'shrink-0 px-2.5 py-1.5 rounded-[3px] text-[9px] font-bold tracking-[0.1em] uppercase transition-all',
              filter === s.id
                ? 'bg-[#F5C542] text-black'
                : 'border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]'
            )}
          >
            {s.name} ({byStage(s.id).length})
          </button>
        ))}
      </div>

      {/* FILTERED LIST */}
      {filter !== 'all' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.length === 0 ? (
            <p className="col-span-full text-sm text-[var(--text-muted)] text-center py-8">
              Aucun invité dans cette colonne{hasQuery ? ' pour cette recherche' : ''}.
            </p>
          ) : (
            filtered.map((g: Guest) => <GuestCard key={g.id} guest={g} />)
          )}
        </div>
      ) : (
        /* KANBAN */
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-3 hide-scroll -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:gap-3 scroll-pl-4">
          {stages.map((stage: PipelineStage) => {
            const items = byStage(stage.id);
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="snap-center shrink-0 w-[calc(100vw-2.5rem)] max-w-[400px] md:w-52 md:max-w-none min-w-0"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[10px] font-black tracking-[0.15em] uppercase text-[var(--text-primary)] truncate pr-2">
                    {stage.name}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0"
                    style={{ backgroundColor: `${stage.color}22`, color: stage.color }}
                  >
                    {items.length}
                  </span>
                </div>
                <div className="min-h-[60px]">
                  {items.map((g: Guest) => (
                    <GuestCard key={g.id} guest={g} compact />
                  ))}
                  {canCreate && (
                  <Link href={`/guests/new?stage=${stage.id}`}>
                    <button
                      type="button"
                      className="w-full mt-1 p-2.5 min-h-[36px] text-center text-[8px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-[3px] hover:border-[#F5C542]/20 hover:text-[#F5C542]/40 transition-all"
                    >
                      + ajouter
                    </button>
                  </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  )
}
