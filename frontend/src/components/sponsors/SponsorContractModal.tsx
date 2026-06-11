'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { GlowButton } from '@/components/ui/GlowButton';
import { api } from '@/lib/api';
import { EpisodePicker } from '@/components/sponsors/EpisodePicker';
import {
  AUTO_SELECT_CONTRACT_TYPES,
  SPONSOR_SEPARATOR,
  applyStartDateWithAutoEnd,
  getAutoEndDate,
  getContractDateErrors,
  getEndDatePlaceholder,
  getEpisodesForContractType,
  getSelectableEpisodes,
  isEndDateOptional,
  pruneEpisodeSelection,
  requiresEndDate,
  resolveContractEndDateForCheck,
  validateEpisodeFormFields,
} from '@/lib/sponsor-utils';
import type { ContractType, EpisodeConflictInfo, SponsorContract } from '@/types';

const DEFAULT_TEMPLATE =
  '🎯 Sponsorisé par {sponsor_name} — {promo_message}\n👉 {tracking_url}\nCode : {discount_code}';

interface SponsorContractModalProps {
  open: boolean;
  onClose: () => void;
  sponsorId: number;
  initial?: SponsorContract | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export function SponsorContractModal({
  open,
  onClose,
  sponsorId,
  initial,
  onSubmit,
}: SponsorContractModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    contractType: 'per_episode' as ContractType,
    crmStatus: 'prospect',
    startDate: '',
    endDate: '',
    amount: '',
    currency: 'MAD',
    commissionRate: '',
    promoMessage: '',
    trackingUrl: '',
    discountCode: '',
    youtubeDescriptionTemplate: DEFAULT_TEMPLATE,
    autoUpdateYoutube: true,
    notes: '',
    episodeIds: [] as number[],
  });

  const { data: episodes = [] } = useQuery({
    queryKey: ['episodes'],
    queryFn: () => api.episodes.list(),
    enabled: open,
  });

  const { data: sponsor } = useQuery({
    queryKey: ['sponsor', sponsorId],
    queryFn: () => api.sponsors.get(sponsorId),
    enabled: open && !!sponsorId,
  });

  const publishedEpisodes = useMemo(
    () => getEpisodesForContractType(episodes, form.contractType, form.startDate, form.endDate),
    [episodes, form.contractType, form.startDate, form.endDate],
  );

  const publishedEpisodeIds = useMemo(
    () => publishedEpisodes.map((e) => e.id),
    [publishedEpisodes],
  );

  const dateErrors = useMemo(
    () =>
      getContractDateErrors({
        contractType: form.contractType,
        episodeIds: form.episodeIds,
        startDate: form.startDate,
        endDate: form.endDate,
      }),
    [form.contractType, form.episodeIds, form.startDate, form.endDate],
  );

  const conflictEndDate = useMemo(
    () => resolveContractEndDateForCheck(form.contractType, form.startDate, form.endDate),
    [form.contractType, form.startDate, form.endDate],
  );

  const canCheckConflicts = Boolean(
    open &&
    form.startDate &&
    !dateErrors.startDate &&
    (!requiresEndDate(form.contractType) || form.endDate) &&
    !dateErrors.endDate,
  );

  const { data: conflictData, isFetching: conflictsLoading } = useQuery({
    queryKey: [
      'contract-episode-conflicts',
      publishedEpisodeIds,
      form.startDate,
      conflictEndDate,
      initial?.id,
    ],
    queryFn: () =>
      api.sponsorContracts.checkConflicts({
        episodeIds: publishedEpisodeIds,
        startDate: form.startDate,
        endDate: conflictEndDate,
        excludeContractId: initial?.id,
        contractType: form.contractType,
      }),
    enabled: canCheckConflicts && publishedEpisodeIds.length > 0,
    staleTime: 0,
  });

  const episodeConflicts = useMemo(() => {
    const map: Record<number, EpisodeConflictInfo> = {};
    conflictData?.conflicts.forEach((c) => {
      map[c.episodeId] = c;
    });
    return map;
  }, [conflictData]);

  const selectableEpisodes = useMemo(
    () => getSelectableEpisodes(publishedEpisodes, Object.keys(episodeConflicts).map(Number)),
    [publishedEpisodes, episodeConflicts],
  );

  const episodeValidation = useMemo(
    () =>
      validateEpisodeFormFields(
        {
          contractType: form.contractType,
          episodeIds: form.episodeIds,
          startDate: form.startDate,
          endDate: form.endDate,
        },
        selectableEpisodes.length,
      ),
    [form.contractType, form.episodeIds, form.startDate, form.endDate, selectableEpisodes.length],
  );

  const canSubmit = useMemo(() => {
    if (form.contractType === 'affiliate') {
      if (form.commissionRate === '' || Number(form.commissionRate) < 0) return false;
    } else if (!form.amount || Number(form.amount) < 0) {
      return false;
    }
    if (conflictsLoading) return false;
    if (episodeValidation.errors.episodeIds) return false;
    if (episodeValidation.errors.startDate) return false;
    if (episodeValidation.errors.endDate) return false;
    return true;
  }, [form, episodeValidation.errors, conflictsLoading]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (initial) {
      setForm({
        contractType: initial.contractType,
        crmStatus: initial.crmStatus,
        startDate: initial.startDate ? String(initial.startDate).slice(0, 10) : '',
        endDate: initial.endDate ? String(initial.endDate).slice(0, 10) : '',
        amount: String(initial.amount),
        currency: initial.currency || 'MAD',
        commissionRate: initial.commissionRate != null ? String(initial.commissionRate) : '',
        promoMessage: initial.promoMessage || '',
        trackingUrl: initial.trackingUrl || '',
        discountCode: initial.discountCode || '',
        youtubeDescriptionTemplate: initial.youtubeDescriptionTemplate || DEFAULT_TEMPLATE,
        autoUpdateYoutube: initial.autoUpdateYoutube,
        notes: initial.notes || '',
        episodeIds: initial.episodes?.map((e) => e.episodeId) ?? [],
      });
    } else {
      setForm({
        contractType: 'per_episode',
        crmStatus: 'prospect',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        amount: '',
        currency: 'MAD',
        commissionRate: '',
        promoMessage: '',
        trackingUrl: '',
        discountCode: '',
        youtubeDescriptionTemplate: DEFAULT_TEMPLATE,
        autoUpdateYoutube: true,
        notes: '',
        episodeIds: [],
      });
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open || conflictsLoading) return;
    setForm((prev) => {
      const pruned = pruneEpisodeSelection(prev.episodeIds, selectableEpisodes);
      if (
        pruned.length === prev.episodeIds.length &&
        pruned.every((id, i) => id === prev.episodeIds[i])
      ) {
        return prev;
      }
      return { ...prev, episodeIds: pruned };
    });
  }, [selectableEpisodes, open, conflictsLoading]);

  useEffect(() => {
    if (!open || conflictsLoading || !AUTO_SELECT_CONTRACT_TYPES.has(form.contractType)) return;
    const ids = selectableEpisodes.map((e) => e.id);
    if (ids.length === 0) return;
    const same =
      ids.length === form.episodeIds.length &&
      ids.every((id) => form.episodeIds.includes(id));
    if (!same) {
      setForm((prev) => ({ ...prev, episodeIds: ids }));
    }
  }, [open, form.contractType, selectableEpisodes, form.episodeIds, conflictsLoading]);

  const preview = useMemo(() => {
    const name = sponsor?.name || '{sponsor_name}';
    return `${SPONSOR_SEPARATOR}${(form.youtubeDescriptionTemplate || DEFAULT_TEMPLATE)
      .replace(/\{sponsor_name\}/g, name)
      .replace(/\{promo_message\}/g, form.promoMessage || '')
      .replace(/\{tracking_url\}/g, form.trackingUrl || '')
      .replace(/\{discount_code\}/g, form.discountCode || '')}`.trim();
  }, [form, sponsor?.name]);

  if (!open) return null;

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = { ...episodeValidation.errors };
    if (form.contractType === 'affiliate') {
      if (form.commissionRate === '' || Number(form.commissionRate) < 0) {
        nextErrors.commissionRate = 'Commission invalide';
      }
    } else if (!form.amount || Number(form.amount) < 0) {
      nextErrors.amount = 'Montant invalide';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await onSubmit({
        sponsorId,
        contractType: form.contractType,
        crmStatus: form.crmStatus,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        amount: form.contractType === 'affiliate' ? 0 : Number(form.amount || 0),
        currency: form.currency,
        commissionRate: form.contractType === 'affiliate' ? Number(form.commissionRate || 0) : null,
        promoMessage: form.promoMessage || null,
        trackingUrl: form.trackingUrl || null,
        discountCode: form.discountCode || null,
        youtubeDescriptionTemplate: form.youtubeDescriptionTemplate || null,
        autoUpdateYoutube: form.autoUpdateYoutube,
        notes: form.notes || null,
        episodeIds: form.episodeIds,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div className="glass-panel w-full sm:max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden p-4 sm:p-6 rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-bold">{initial ? 'Modifier le contrat' : 'Nouveau contrat'}</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Type de contrat"
              value={form.contractType}
              onChange={(e) => {
                const contractType = e.target.value as ContractType;
                const autoEnd = getAutoEndDate(contractType, form.startDate);
                setForm({
                  ...form,
                  contractType,
                  episodeIds: [],
                  endDate: autoEnd ?? (isEndDateOptional(contractType) ? '' : form.endDate),
                });
              }}
            >
              <option value="per_episode">Par épisode</option>
              <option value="monthly">Mensuel</option>
              <option value="campaign">Campagne</option>
              <option value="recurring">Récurrent</option>
              <option value="annual">Annuel</option>
              <option value="affiliate">Affiliation</option>
              <option value="package">Package</option>
            </Select>
            <Select label="Statut CRM" value={form.crmStatus} onChange={(e) => setForm({ ...form, crmStatus: e.target.value })}>
              <option value="prospect">Prospect</option>
              <option value="contacte">Contacté</option>
              <option value="nego">En négociation</option>
              <option value="confirme">Confirmé</option>
              <option value="refuse">Refusé</option>
              <option value="partenaire_recurrent">Partenaire récurrent</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Date début *"
              type="date"
              value={form.startDate}
              onChange={(e) => {
                const dates = applyStartDateWithAutoEnd(form.contractType, e.target.value, form.endDate);
                setForm({ ...form, ...dates });
              }}
              error={errors.startDate || episodeValidation.errors.startDate}
            />
            <Input
              label={requiresEndDate(form.contractType) ? 'Date fin *' : 'Date fin'}
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              error={errors.endDate || episodeValidation.errors.endDate}
              placeholder={getEndDatePlaceholder(form.contractType)}
              hint={
                isEndDateOptional(form.contractType) && !form.endDate
                  ? 'Optionnelle — sans limite'
                  : undefined
              }
            />
            <Select label="Devise" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="MAD">MAD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>

          {form.contractType === 'affiliate' ? (
            <Input label="Commission (%)" type="number" min="0" max="100" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} error={errors.commissionRate} />
          ) : (
            <Input label="Montant" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={errors.amount} />
          )}

          <Input label="Message promo" value={form.promoMessage} onChange={(e) => setForm({ ...form, promoMessage: e.target.value })} />
          <Input label="URL de tracking" value={form.trackingUrl} onChange={(e) => setForm({ ...form, trackingUrl: e.target.value })} />
          <Input label="Code promo" value={form.discountCode} onChange={(e) => setForm({ ...form, discountCode: e.target.value })} />

          <Textarea
            label="Template description YouTube"
            rows={4}
            value={form.youtubeDescriptionTemplate}
            onChange={(e) => setForm({ ...form, youtubeDescriptionTemplate: e.target.value })}
          />

          <div className="rounded-xl border border-[var(--border-subtle)] p-3 bg-white/[0.02]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Aperçu YouTube</p>
            <pre className="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap font-sans">{preview}</pre>
          </div>

          <EpisodePicker
            episodes={episodes}
            contractType={form.contractType}
            startDate={form.startDate}
            endDate={form.endDate}
            selectedIds={form.episodeIds}
            onChange={(episodeIds) => setForm((f) => ({ ...f, episodeIds }))}
            episodeConflicts={episodeConflicts}
            conflictsLoading={conflictsLoading && canCheckConflicts}
          />

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.autoUpdateYoutube} onChange={(e) => setForm({ ...form, autoUpdateYoutube: e.target.checked })} />
            Mise à jour YouTube automatique
          </label>

          <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)] shrink-0">
          <GlowButton variant="ghost" className="flex-1" onClick={onClose}>Annuler</GlowButton>
          <GlowButton className="flex-1" onClick={handleSubmit} disabled={loading || !canSubmit}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </GlowButton>
        </div>
      </motion.div>
    </div>
  );
}
