'use client';

import { useMemo, useState } from 'react';
import { Calendar, Package, Mic2, Search } from 'lucide-react';
import {
  AUTO_SELECT_CONTRACT_TYPES,
  formatConflictBadge,
  getEpisodeCounterLabel,
  getEpisodeLabel,
  getEpisodePickerMode,
  getEpisodeSelectionError,
  getContractDateErrors,
  getEpisodesForContractType,
  getSelectableEpisodes,
  requiresEndDate,
} from '@/lib/sponsor-utils';
import type { Episode, EpisodeConflictInfo } from '@/types';

interface EpisodePickerProps {
  episodes: Episode[];
  contractType: string;
  startDate: string;
  endDate: string;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  error?: string;
  episodeConflicts?: Record<number, EpisodeConflictInfo>;
  conflictsLoading?: boolean;
  /** When set, only these episode IDs are selectable; others appear grayed out. */
  allowedEpisodeIds?: number[];
}

function formatPublicationDate(date?: string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function EpisodePicker({
  episodes,
  contractType,
  startDate,
  endDate,
  selectedIds,
  onChange,
  error,
  episodeConflicts = {},
  conflictsLoading = false,
  allowedEpisodeIds,
}: EpisodePickerProps) {
  const allowedSet = useMemo(
    () => (allowedEpisodeIds?.length ? new Set(allowedEpisodeIds) : null),
    [allowedEpisodeIds],
  );
  const isEpisodeLocked = (id: number) => Boolean(allowedSet && !allowedSet.has(id));
  const [search, setSearch] = useState('');
  const mode = getEpisodePickerMode(contractType);
  const isAutoSelect = AUTO_SELECT_CONTRACT_TYPES.has(contractType);

  const allPublished = useMemo(
    () => getEpisodesForContractType(episodes, contractType, startDate, endDate),
    [episodes, contractType, startDate, endDate],
  );

  const conflictIds = useMemo(
    () => new Set(Object.keys(episodeConflicts).map(Number)),
    [episodeConflicts],
  );

  const selectable = useMemo(
    () => getSelectableEpisodes(allPublished, conflictIds),
    [allPublished, conflictIds],
  );

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? allPublished.filter((ep) => getEpisodeLabel(ep).toLowerCase().includes(q))
      : allPublished;

    return [...filtered].sort((a, b) => {
      const aConflict = conflictIds.has(a.id);
      const bConflict = conflictIds.has(b.id);
      if (aConflict !== bConflict) return aConflict ? 1 : -1;
      const aSelected = selectedIds.includes(a.id);
      const bSelected = selectedIds.includes(b.id);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return (a.episodeNumber || 999) - (b.episodeNumber || 999);
    });
  }, [allPublished, selectedIds, search, conflictIds]);

  const toggle = (id: number) => {
    if (conflictIds.has(id) || isEpisodeLocked(id)) return;
    if (allowedSet && allowedSet.has(id) && selectedIds.includes(id)) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const selectAll = () => onChange(selectable.map((e) => e.id));
  const clearAll = () => onChange([]);

  const title =
    mode === 'package_all'
      ? 'Épisodes du package *'
      : isAutoSelect
        ? 'Épisodes à sponsoriser *'
        : 'Épisodes publiés *';

  const Icon = mode === 'package_all' ? Package : mode === 'period_range' ? Calendar : Mic2;

  const hint = allowedSet
    ? 'Épisode fixé pour ce contrat par épisode — les autres épisodes ne sont pas sélectionnables.'
    : 'Tous les épisodes publiés sont listés. Les dates du contrat définissent la période d\'affichage du sponsor, pas la date de publication.';

  const datesReady =
    Boolean(contractType) &&
    Boolean(startDate) &&
    (!requiresEndDate(contractType) || Boolean(endDate)) &&
    Object.keys(
      getContractDateErrors({
        contractType,
        episodeIds: selectedIds,
        startDate,
        endDate,
      }),
    ).length === 0;

  const inlineEpisodeError =
    error ||
    getEpisodeSelectionError(contractType, selectedIds.length, selectable.length, {
      startDate,
      endDate,
    });

  const counter = getEpisodeCounterLabel(contractType, selectedIds.length);
  const showPicker = datesReady && !conflictsLoading;
  const allConflicted = datesReady && !conflictsLoading && allPublished.length > 0 && selectable.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <p className="input-label !mb-0">{title}</p>
        </div>
        {showPicker && allPublished.length > 0 && (
          <span
            className={`text-[11px] font-semibold shrink-0 ${
              counter.ok ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {counter.text}
          </span>
        )}
      </div>
      <p className="text-[10px] text-[var(--text-dimmed)] mb-2">{hint}</p>

      {conflictsLoading && datesReady && (
        <p className="text-[11px] text-[var(--text-muted)] mb-2">Vérification des conflits de sponsoring...</p>
      )}

      {showPicker && allPublished.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] text-[var(--text-muted)]">
              <span className={selectable.length > 0 ? 'text-emerald-400/90' : 'text-red-400'}>
                {selectable.length} disponible{selectable.length > 1 ? 's' : ''}
              </span>
              {' '}sur {allPublished.length} total
            </span>
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-dimmed)] pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre..."
              className="w-full h-9 pl-8 pr-3 text-sm rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] text-[var(--text-primary)] placeholder:text-[var(--text-dimmed)] focus:outline-none focus:border-violet-400/40"
            />
          </div>

          {selectable.length > 0 && !allowedSet && (
            <div className="flex items-center justify-end gap-2 mb-2">
              <button type="button" className="text-[10px] text-violet-400 hover:underline" onClick={selectAll}>
                Tout sélectionner
              </button>
              <button type="button" className="text-[10px] text-[var(--text-muted)] hover:underline" onClick={clearAll}>
                Effacer
              </button>
            </div>
          )}
        </>
      )}

      <div
        className={`space-y-0.5 border rounded-xl p-2 ${
          allPublished.length > 5 ? 'max-h-[280px] overflow-y-auto' : ''
        } ${inlineEpisodeError ? 'border-red-400/50' : 'border-[var(--border-subtle)]'}`}
      >
        {datesReady && conflictsLoading && (
          <p className="text-[11px] text-[var(--text-muted)] text-center py-4">
            Chargement des épisodes...
          </p>
        )}

        {showPicker && allPublished.length === 0 && (
          <p className="text-[11px] text-[var(--text-muted)] text-center py-4">
            Aucun épisode publié disponible.
          </p>
        )}

        {allConflicted && (
          <p className="text-[11px] text-red-400 text-center py-4 px-2">
            Tous les épisodes sont déjà sponsorisés sur cette période. Changez les dates.
          </p>
        )}

        {showPicker && allPublished.length > 0 && filteredAndSorted.length === 0 && (
          <p className="text-[11px] text-[var(--text-muted)] text-center py-4">
            Aucun épisode ne correspond à votre recherche.
          </p>
        )}

        {showPicker &&
          filteredAndSorted.map((ep) => {
            const conflict = episodeConflicts[ep.id];
            const locked = isEpisodeLocked(ep.id);
            const isConflict = Boolean(conflict) || locked;
            const pubDate = formatPublicationDate(ep.publicationDate);
            const num = ep.episodeNumber != null ? `#${ep.episodeNumber}` : `#${ep.id}`;
            const guestName = ep.guest
              ? `${ep.guest.firstName || ''} ${ep.guest.lastName || ''}`.trim()
              : '';
            const titleText = ep.title || guestName || 'Sans titre';

            return (
              <label
                key={ep.id}
                className={`flex items-start gap-2.5 text-sm px-2 py-2 rounded-lg min-h-[40px] ${
                  isConflict
                    ? 'opacity-50 cursor-not-allowed bg-white/[0.01]'
                    : selectedIds.includes(ep.id)
                      ? 'bg-violet-500/10 hover:bg-violet-500/15 cursor-pointer'
                      : 'hover:bg-white/[0.03] cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0 rounded"
                  checked={selectedIds.includes(ep.id)}
                  disabled={isConflict}
                  onChange={() => toggle(ep.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5 min-w-0">
                    <span className={`shrink-0 text-[11px] font-bold ${isConflict ? 'text-[var(--text-dimmed)]' : 'text-violet-400'}`}>
                      {num}
                    </span>
                    <span className={`truncate ${isConflict ? 'text-[var(--text-dimmed)]' : 'text-[var(--text-primary)]'}`}>
                      {titleText}
                    </span>
                  </span>
                  {pubDate && (
                    <span className="text-[10px] text-[var(--text-dimmed)]">Publié le {pubDate}</span>
                  )}
                  {locked && (
                    <span className="inline-block mt-1 text-[9px] font-semibold text-[var(--text-dimmed)] bg-white/[0.03] border border-[var(--border-subtle)] rounded-md px-1.5 py-0.5">
                      Autre épisode
                    </span>
                  )}
                  {isConflict && conflict && (
                    <span className="inline-block mt-1 text-[9px] font-semibold text-red-400 bg-red-400/10 border border-red-400/25 rounded-md px-1.5 py-0.5">
                      {formatConflictBadge(conflict)}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
      </div>

      {inlineEpisodeError && (
        <p className="text-[11px] text-red-400 mt-1">{inlineEpisodeError}</p>
      )}
    </div>
  );
}
