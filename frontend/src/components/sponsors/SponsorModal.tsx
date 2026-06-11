'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { GlowButton } from '@/components/ui/GlowButton';
import { EpisodePicker } from '@/components/sponsors/EpisodePicker';
import { api } from '@/lib/api';
import {
  AUTO_SELECT_CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
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
  getYoutubeFieldsErrors,
  validateEpisodeFormFields,
} from '@/lib/sponsor-utils';
import type { Episode, EpisodeConflictInfo, Sponsor } from '@/types';

export interface SponsorFormData {
  episodeIds: number[];
  episodeId: number;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  sponsorType: string;
  contractType: string;
  amount: string;
  status: string;
  trackingUrl: string;
  promoMessage: string;
  autoUpdateYoutube: boolean;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  notes: string;
}

interface SponsorModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SponsorFormData) => Promise<void>;
  episodes: Episode[];
  initial?: Sponsor | null;
  /** Lock to per_episode with a single pre-selected episode (e.g. from guest/episode page). */
  fixedEpisodeId?: number;
}

const emptyForm: SponsorFormData = {
  episodeIds: [],
  episodeId: 0,
  name: '',
  contactName: '',
  email: '',
  phone: '',
  sponsorType: 'mention',
  contractType: '',
  amount: '',
  status: 'prospect',
  trackingUrl: '',
  promoMessage: '',
  autoUpdateYoutube: true,
  startDate: '',
  endDate: '',
  isRecurring: false,
  notes: '',
};

const mobileFieldClass = '!h-10 !min-h-[40px] text-sm sm:!h-[42px] sm:!min-h-0 sm:text-base';

export function SponsorModal({ open, onClose, onSubmit, episodes, initial, fixedEpisodeId }: SponsorModalProps) {
  const [form, setForm] = useState<SponsorFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ['sponsor-contracts-edit', initial?.id],
    queryFn: () => api.sponsorContracts.list({ sponsorId: initial!.id, limit: 50 }),
    enabled: open && !!initial?.id,
    staleTime: 0,
  });

  const editContract = useMemo(() => {
    if (!initial) return undefined;
    const contracts = contractsData?.data?.length
      ? contractsData.data
      : (initial.contracts ?? []);
    return contracts.find((c) => c.contractStatus === 'active') ?? contracts[0];
  }, [initial, contractsData]);

  const excludeContractId = editContract?.id;

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
    form.contractType &&
    form.startDate &&
    !dateErrors.startDate &&
    (!requiresEndDate(form.contractType) || form.endDate) &&
    !dateErrors.endDate,
  );

  const { data: conflictData, isFetching: conflictsLoading } = useQuery({
    queryKey: [
      'sponsor-episode-conflicts',
      publishedEpisodeIds,
      form.startDate,
      conflictEndDate,
      excludeContractId,
      form.contractType,
    ],
    queryFn: () =>
      api.sponsorContracts.checkConflicts({
        episodeIds: publishedEpisodeIds,
        startDate: form.startDate,
        endDate: conflictEndDate,
        excludeContractId,
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

  const youtubeFieldErrors = useMemo(
    () =>
      getYoutubeFieldsErrors(form.autoUpdateYoutube, form.trackingUrl, form.promoMessage),
    [form.autoUpdateYoutube, form.trackingUrl, form.promoMessage],
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
    if (!form.name.trim()) return false;
    if (!form.contractType) return false;
    if (!form.amount || Number(form.amount) < 0) return false;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return false;
    if (conflictsLoading) return false;
    if (episodeValidation.errors.episodeIds) return false;
    if (dateErrors.startDate) return false;
    if (dateErrors.endDate) return false;
    if (youtubeFieldErrors.trackingUrl) return false;
    if (youtubeFieldErrors.promoMessage) return false;
    return true;
  }, [form, episodeValidation.errors, dateErrors, conflictsLoading, youtubeFieldErrors]);

  useEffect(() => {
    if (!open) return;

    if (!initial) {
      setForm({
        ...emptyForm,
        startDate: new Date().toISOString().slice(0, 10),
        ...(fixedEpisodeId
          ? {
              contractType: 'per_episode',
              episodeIds: [fixedEpisodeId],
              episodeId: fixedEpisodeId,
            }
          : {}),
      });
      setErrors({});
      setTouched(false);
      return;
    }

    if (contractsLoading) return;

    const contract = editContract;
    const initialEpisodeIds =
      contract?.episodes?.map((e) => e.episodeId).filter(Boolean) ??
      [initial.episodeId].filter(Boolean);

    setForm({
      episodeIds: initialEpisodeIds,
      episodeId: initialEpisodeIds[0] || initial.episodeId,
      name: initial.name,
      contactName: initial.contactName || '',
      email: initial.email || '',
      phone: initial.phone || '',
      sponsorType: initial.sponsorType,
      contractType: contract?.contractType || 'per_episode',
      amount: String(initial.amount),
      status: initial.status,
      trackingUrl: contract?.trackingUrl || '',
      promoMessage: contract?.promoMessage || '',
      autoUpdateYoutube: contract?.autoUpdateYoutube ?? true,
      startDate: contract?.startDate
        ? String(contract.startDate).slice(0, 10)
        : initial.startDate
          ? String(initial.startDate).slice(0, 10)
          : '',
      endDate: contract?.endDate
        ? String(contract.endDate).slice(0, 10)
        : initial.endDate
          ? String(initial.endDate).slice(0, 10)
          : '',
      isRecurring: initial.isRecurring ?? false,
      notes: initial.notes || '',
    });
    setErrors({});
    setTouched(false);
  }, [initial, open, episodes, contractsLoading, editContract, fixedEpisodeId]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open || conflictsLoading || (initial && contractsLoading) || fixedEpisodeId) return;
    setForm((prev) => {
      const pruned = pruneEpisodeSelection(prev.episodeIds, selectableEpisodes);
      if (
        pruned.length === prev.episodeIds.length &&
        pruned.every((id, i) => id === prev.episodeIds[i])
      ) {
        return prev;
      }
      return {
        ...prev,
        episodeIds: pruned,
        episodeId: pruned[0] || 0,
      };
    });
  }, [selectableEpisodes, open, conflictsLoading, initial, contractsLoading, fixedEpisodeId]);

  useEffect(() => {
    if (!open || conflictsLoading || !AUTO_SELECT_CONTRACT_TYPES.has(form.contractType)) return;
    const ids = selectableEpisodes.map((e) => e.id);
    if (ids.length === 0) return;
    const same =
      ids.length === form.episodeIds.length &&
      ids.every((id) => form.episodeIds.includes(id));
    if (!same) {
      setForm((prev) => ({
        ...prev,
        episodeIds: ids,
        episodeId: ids[0] || 0,
      }));
    }
  }, [open, form.contractType, selectableEpisodes, form.episodeIds, conflictsLoading]);

  const setContractType = (contractType: string) => {
    setForm((prev) => {
      const autoEnd = getAutoEndDate(contractType, prev.startDate);
      return {
        ...prev,
        contractType,
        episodeIds: [],
        episodeId: 0,
        endDate: autoEnd ?? (isEndDateOptional(contractType) ? '' : prev.endDate),
      };
    });
    setErrors((e) => {
      const next = { ...e };
      delete next.episodeIds;
      delete next.contractType;
      return next;
    });
  };

  const handleStartDateChange = (startDate: string) => {
    setForm((prev) => {
      const dates = applyStartDateWithAutoEnd(prev.contractType, startDate, prev.endDate);
      return { ...prev, ...dates };
    });
    setErrors((e) => {
      const next = { ...e };
      delete next.startDate;
      delete next.endDate;
      return next;
    });
  };

  const setEpisodeIds = (episodeIds: number[]) => {
    setForm((prev) => ({
      ...prev,
      episodeIds,
      episodeId: episodeIds[0] || 0,
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next.episodeIds;
      return next;
    });
  };

  if (!open || !mounted) return null;

  const validate = () => {
    const e: Record<string, string> = {
      ...getContractDateErrors({
        contractType: form.contractType,
        episodeIds: form.episodeIds,
        startDate: form.startDate,
        endDate: form.endDate,
      }),
    };
    if (episodeValidation.errors.episodeIds) e.episodeIds = episodeValidation.errors.episodeIds;
    if (!form.name.trim()) e.name = 'Nom requis';
    if (!form.contractType) e.contractType = 'Veuillez choisir un type de sponsoring';
    if (!form.amount || Number(form.amount) < 0) e.amount = 'Montant invalide';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide';
    Object.assign(e, youtubeFieldErrors);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch {
      // Parent mutation onError shows the toast
    } finally {
      setLoading(false);
    }
  };

  const displayErrors = touched ? errors : {};
  const contractTypeError = displayErrors.contractType || (touched ? episodeValidation.errors.contractType : undefined);
  const startDateError = displayErrors.startDate || dateErrors.startDate;
  const endDateError = displayErrors.endDate || dateErrors.endDate;
  const episodeIdsError = displayErrors.episodeIds || episodeValidation.errors.episodeIds;
  const trackingUrlError = displayErrors.trackingUrl || youtubeFieldErrors.trackingUrl;
  const promoMessageError = displayErrors.promoMessage || youtubeFieldErrors.promoMessage;
  const youtubeRequired = form.autoUpdateYoutube;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-2 pb-2 sm:p-4 bg-black/60 backdrop-blur-sm max-w-[100vw] overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full sm:max-w-lg max-h-[78dvh] sm:max-h-[90vh] flex flex-col overflow-hidden p-2.5 sm:p-6 rounded-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between mb-2 sm:mb-6 shrink-0">
          <h2 className="text-sm sm:text-lg font-bold">
            {initial ? 'Modifier le sponsor' : 'Nouveau sponsor'}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px]" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="space-y-1.5 sm:space-y-4 pb-0.5 [&_.input-label]:text-[10px] [&_.input-label]:mb-1 sm:[&_.input-label]:text-xs sm:[&_.input-label]:mb-1.5">
            <Input className={mobileFieldClass} label="Nom du sponsor *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={displayErrors.name} />
            <Input className={mobileFieldClass} label="Nom du contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3">
              <Input className={mobileFieldClass} label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={displayErrors.email} />
              <Input className={mobileFieldClass} label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <Select
              className={mobileFieldClass}
              label="Type de sponsoring *"
              value={form.contractType}
              onChange={(e) => setContractType(e.target.value)}
              error={contractTypeError}
              disabled={!!fixedEpisodeId}
            >
              <option value="">— Choisir un type —</option>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>

            {form.contractType && (
              <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                <Input
                  className={mobileFieldClass}
                  label="Date début *"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  error={startDateError}
                />
                <Input
                  className={mobileFieldClass}
                  label={requiresEndDate(form.contractType) ? 'Date fin *' : 'Date fin'}
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  error={endDateError}
                  placeholder={getEndDatePlaceholder(form.contractType)}
                  hint={
                    isEndDateOptional(form.contractType) && !form.endDate
                      ? 'Optionnelle — sans limite'
                      : undefined
                  }
                />
              </div>
            )}

            {form.contractType && (
              <EpisodePicker
                episodes={episodes}
                contractType={form.contractType}
                startDate={form.startDate}
                endDate={form.endDate}
                selectedIds={form.episodeIds}
                onChange={setEpisodeIds}
                error={episodeIdsError}
                episodeConflicts={episodeConflicts}
                conflictsLoading={conflictsLoading && canCheckConflicts}
                allowedEpisodeIds={fixedEpisodeId ? [fixedEpisodeId] : undefined}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3">
              <Select className={mobileFieldClass} label="Format mention" value={form.sponsorType} onChange={(e) => setForm({ ...form, sponsorType: e.target.value })}>
                <option value="preroll">Preroll</option>
                <option value="midroll">Midroll</option>
                <option value="postroll">Postroll</option>
                <option value="mention">Mention</option>
                <option value="partenaire">Partenaire</option>
              </Select>
              <Input className={mobileFieldClass} label="Montant (MAD) *" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={displayErrors.amount} />
            </div>
            <label className="flex items-center gap-2 text-[11px] sm:text-sm text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoUpdateYoutube}
                onChange={(e) => {
                  setForm({ ...form, autoUpdateYoutube: e.target.checked });
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.trackingUrl;
                    delete next.promoMessage;
                    return next;
                  });
                }}
                className="rounded w-3.5 h-3.5 sm:w-4 sm:h-4"
              />
              Mise à jour YouTube automatique
            </label>
            <Input
              className={mobileFieldClass}
              label={youtubeRequired ? 'Lien sponsor (tracking) *' : 'Lien sponsor (tracking)'}
              value={form.trackingUrl}
              onChange={(e) => {
                setForm({ ...form, trackingUrl: e.target.value });
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.trackingUrl;
                  return next;
                });
              }}
              placeholder="https://..."
              error={trackingUrlError}
            />
            <Input
              className={mobileFieldClass}
              label={youtubeRequired ? 'Message promo *' : 'Message promo'}
              value={form.promoMessage}
              onChange={(e) => {
                setForm({ ...form, promoMessage: e.target.value });
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.promoMessage;
                  return next;
                });
              }}
              placeholder="Offre spéciale pour les auditeurs..."
              error={promoMessageError}
            />
            <Select className={mobileFieldClass} label="Statut" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="prospect">Prospect</option>
              <option value="contacte">Contacté</option>
              <option value="nego">En négociation</option>
              <option value="confirme">Confirmé</option>
              <option value="refuse">Refusé</option>
              <option value="partenaire_recurrent">Partenaire récurrent ⭐</option>
            </Select>

            <label className="flex items-center gap-2 text-[11px] sm:text-sm text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="rounded w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Partenaire récurrent
            </label>
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="!min-h-0 !h-[44px] text-sm resize-none sm:!min-h-[88px] sm:!h-auto sm:text-base sm:resize-y"
            />
          </div>
        </div>

        <div className="shrink-0 flex flex-row gap-2 sm:gap-3 mt-1.5 sm:mt-6 pt-2 sm:pt-0 border-t border-[var(--border-subtle)] pb-safe sm:pb-0">
          <GlowButton variant="ghost" size="sm" className="flex-1 !min-h-[40px] sm:!min-h-0" onClick={onClose}>
            Annuler
          </GlowButton>
          <GlowButton
            size="sm"
            className="flex-1 !min-h-[40px] sm:!min-h-0"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </GlowButton>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
