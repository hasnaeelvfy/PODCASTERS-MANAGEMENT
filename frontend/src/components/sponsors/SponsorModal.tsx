'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { GlowButton } from '@/components/ui/GlowButton';
import { EpisodePicker } from '@/components/sponsors/EpisodePicker';
import {
  CONTRACT_TYPE_LABELS,
  getEpisodesForContractType,
  pruneEpisodeSelection,
  requiresContractDates,
} from '@/lib/sponsor-utils';
import type { Sponsor, Episode } from '@/types';

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
}

const emptyForm: SponsorFormData = {
  episodeIds: [],
  episodeId: 0,
  name: '',
  contactName: '',
  email: '',
  phone: '',
  sponsorType: 'mention',
  contractType: 'per_episode',
  amount: '',
  status: 'prospect',
  trackingUrl: '',
  promoMessage: '',
  startDate: '',
  endDate: '',
  isRecurring: false,
  notes: '',
};

const mobileFieldClass = '!h-10 !min-h-[40px] text-sm sm:!h-[42px] sm:!min-h-0 sm:text-base';

export function SponsorModal({ open, onClose, onSubmit, episodes, initial }: SponsorModalProps) {
  const [form, setForm] = useState<SponsorFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const availableEpisodes = useMemo(
    () => getEpisodesForContractType(episodes, form.contractType, form.startDate, form.endDate),
    [episodes, form.contractType, form.startDate, form.endDate],
  );

  useEffect(() => {
    if (initial) {
      const contract = initial.contracts?.[0];
      const initialEpisodeIds = contract?.episodes?.map((e) => e.episodeId) ?? [initial.episodeId];
      setForm({
        episodeIds: initialEpisodeIds.filter(Boolean),
        episodeId: initial.episodeId,
        name: initial.name,
        contactName: initial.contactName || '',
        email: initial.email || '',
        phone: initial.phone || '',
        sponsorType: initial.sponsorType,
        contractType: contract?.contractType || 'per_episode',
        amount: String(initial.amount),
        status: initial.status,
        trackingUrl: '',
        promoMessage: '',
        startDate: initial.startDate ? String(initial.startDate).slice(0, 10) : '',
        endDate: initial.endDate ? String(initial.endDate).slice(0, 10) : '',
        isRecurring: initial.isRecurring ?? false,
        notes: initial.notes || '',
      });
    } else {
      setForm({
        ...emptyForm,
        startDate: new Date().toISOString().slice(0, 10),
      });
    }
    setErrors({});
  }, [initial, open, episodes]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    setForm((prev) => {
      const pruned = pruneEpisodeSelection(prev.episodeIds, availableEpisodes);
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
  }, [availableEpisodes, open]);

  const setContractType = (contractType: string) => {
    setForm((prev) => ({
      ...prev,
      contractType,
      episodeIds: [],
      episodeId: 0,
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next.episodeIds;
      return next;
    });
  };

  const setEpisodeIds = (episodeIds: number[]) => {
    setForm((prev) => ({
      ...prev,
      episodeIds,
      episodeId: episodeIds[0] || 0,
    }));
    if (episodeIds.length > 0) {
      setErrors((e) => {
        const next = { ...e };
        delete next.episodeIds;
        return next;
      });
    }
  };

  if (!open) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nom requis';
    if (!form.episodeIds.length) e.episodeIds = 'Sélectionnez au moins un épisode';
    if (!form.amount || Number(form.amount) < 0) e.amount = 'Montant invalide';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide';
    if (requiresContractDates(form.contractType)) {
      if (!form.startDate) e.startDate = 'Date de début requise';
      if (!form.endDate) e.endDate = 'Date de fin requise';
      if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
        e.endDate = 'La date de fin doit être après la date de début';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
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

  const showDatesFirst = requiresContractDates(form.contractType) || form.contractType === 'package';

  return (
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
            <Input className={mobileFieldClass} label="Nom du sponsor *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
            <Input className={mobileFieldClass} label="Nom du contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3">
              <Input className={mobileFieldClass} label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
              <Input className={mobileFieldClass} label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <Select
              className={mobileFieldClass}
              label="Type de sponsoring *"
              value={form.contractType}
              onChange={(e) => setContractType(e.target.value)}
            >
              {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>

            {showDatesFirst && (
              <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                <Input
                  className={mobileFieldClass}
                  label={requiresContractDates(form.contractType) ? 'Date début *' : 'Date début'}
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  error={errors.startDate}
                />
                <Input
                  className={mobileFieldClass}
                  label={requiresContractDates(form.contractType) ? 'Date fin *' : 'Date fin'}
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  error={errors.endDate}
                />
              </div>
            )}

            <EpisodePicker
              episodes={episodes}
              contractType={form.contractType}
              startDate={form.startDate}
              endDate={form.endDate}
              selectedIds={form.episodeIds}
              onChange={setEpisodeIds}
              error={errors.episodeIds}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3">
              <Select className={mobileFieldClass} label="Format mention" value={form.sponsorType} onChange={(e) => setForm({ ...form, sponsorType: e.target.value })}>
                <option value="preroll">Preroll</option>
                <option value="midroll">Midroll</option>
                <option value="postroll">Postroll</option>
                <option value="mention">Mention</option>
                <option value="partenaire">Partenaire</option>
              </Select>
              <Input className={mobileFieldClass} label="Montant (MAD) *" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={errors.amount} />
            </div>
            <Input
              className={mobileFieldClass}
              label="Lien sponsor (tracking)"
              value={form.trackingUrl}
              onChange={(e) => setForm({ ...form, trackingUrl: e.target.value })}
              placeholder="https://..."
            />
            <Input
              className={mobileFieldClass}
              label="Message promo"
              value={form.promoMessage}
              onChange={(e) => setForm({ ...form, promoMessage: e.target.value })}
              placeholder="Offre spéciale pour les auditeurs..."
            />
            <Select className={mobileFieldClass} label="Statut" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="prospect">Prospect</option>
              <option value="contacte">Contacté</option>
              <option value="nego">En négociation</option>
              <option value="confirme">Confirmé</option>
              <option value="refuse">Refusé</option>
              <option value="partenaire_recurrent">Partenaire récurrent ⭐</option>
            </Select>

            {!showDatesFirst && (
              <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                <Input className={mobileFieldClass} label="Date début" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                <Input className={mobileFieldClass} label="Date fin" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            )}

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
          <GlowButton size="sm" className="flex-1 !min-h-[40px] sm:!min-h-0" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </GlowButton>
        </div>
      </motion.div>
    </div>
  );
}
