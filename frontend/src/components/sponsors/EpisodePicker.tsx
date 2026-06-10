'use client';

import { useMemo } from 'react';
import { Calendar, Package, Mic2 } from 'lucide-react';
import {
  getEpisodeLabel,
  getEpisodePickerMode,
  getEpisodesForContractType,
  requiresContractDates,
} from '@/lib/sponsor-utils';
import type { Episode } from '@/types';

interface EpisodePickerProps {
  episodes: Episode[];
  contractType: string;
  startDate: string;
  endDate: string;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}

export function EpisodePicker({
  episodes,
  contractType,
  startDate,
  endDate,
  selectedIds,
  onChange,
  error,
}: EpisodePickerProps) {
  const mode = getEpisodePickerMode(contractType);
  const needsDates = requiresContractDates(contractType);

  const available = useMemo(
    () => getEpisodesForContractType(episodes, contractType, startDate, endDate),
    [episodes, contractType, startDate, endDate],
  );

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const selectAll = () => onChange(available.map((e) => e.id));
  const clearAll = () => onChange([]);

  const title =
    mode === 'package_all'
      ? 'Épisodes du package *'
      : mode === 'period_range'
        ? 'Épisodes publiés dans la période *'
        : 'Épisodes publiés *';

  const Icon = mode === 'package_all' ? Package : mode === 'period_range' ? Calendar : Mic2;

  const hint =
    mode === 'package_all'
      ? 'Cochez les épisodes publiés inclus dans ce package.'
      : mode === 'period_range'
        ? 'Seuls les épisodes publiés entre les dates du contrat sont affichés.'
        : 'Sélectionnez un ou plusieurs épisodes publiés.';

  const datesMissing = needsDates && (!startDate || !endDate);
  const datesInvalid = needsDates && startDate && endDate && new Date(endDate) < new Date(startDate);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-violet-400" />
        <p className="input-label !mb-0">{title}</p>
      </div>
      <p className="text-[10px] text-[var(--text-dimmed)] mb-2">{hint}</p>

      {datesMissing && (
        <p className="text-[11px] text-amber-400/90 mb-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2">
          Renseignez les dates de début et de fin du contrat pour afficher les épisodes de la période.
        </p>
      )}

      {datesInvalid && (
        <p className="text-[11px] text-red-400 mb-2">La date de fin doit être après la date de début.</p>
      )}

      {!datesMissing && !datesInvalid && available.length > 0 && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] text-[var(--text-muted)]">
            {selectedIds.length} / {available.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button type="button" className="text-[10px] text-violet-400 hover:underline" onClick={selectAll}>
              Tout sélectionner
            </button>
            <button type="button" className="text-[10px] text-[var(--text-muted)] hover:underline" onClick={clearAll}>
              Effacer
            </button>
          </div>
        </div>
      )}

      <div
        className={`max-h-44 overflow-y-auto space-y-0.5 border rounded-xl p-2 ${
          error ? 'border-red-400/50' : 'border-[var(--border-subtle)]'
        }`}
      >
        {!datesMissing && !datesInvalid && available.length === 0 && (
          <p className="text-[11px] text-[var(--text-muted)] text-center py-4">
            {mode === 'period_range'
              ? 'Aucun épisode publié dans cette période.'
              : 'Aucun épisode publié disponible.'}
          </p>
        )}

        {available.map((ep) => (
          <label
            key={ep.id}
            className="flex items-start gap-2.5 text-sm px-2 py-2 rounded-lg hover:bg-white/[0.03] cursor-pointer min-h-[40px]"
          >
            <input
              type="checkbox"
              className="mt-0.5 shrink-0 rounded"
              checked={selectedIds.includes(ep.id)}
              onChange={() => toggle(ep.id)}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[var(--text-primary)]">{getEpisodeLabel(ep)}</span>
              {ep.publicationDate && (
                <span className="text-[10px] text-[var(--text-dimmed)]">
                  Publié le {new Date(ep.publicationDate).toLocaleDateString('fr-FR')}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>

      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}
