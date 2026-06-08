'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { GlowButton } from '@/components/ui/GlowButton';
import type { Sponsor, Episode } from '@/types';

export interface SponsorFormData {
  episodeId: number;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  sponsorType: string;
  amount: string;
  status: string;
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
  episodeId: 0,
  name: '',
  contactName: '',
  email: '',
  phone: '',
  sponsorType: 'mention',
  amount: '',
  status: 'prospect',
  startDate: '',
  endDate: '',
  isRecurring: false,
  notes: '',
};

export function SponsorModal({ open, onClose, onSubmit, episodes, initial }: SponsorModalProps) {
  const [form, setForm] = useState<SponsorFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        episodeId: initial.episodeId,
        name: initial.name,
        contactName: initial.contactName || '',
        email: initial.email || '',
        phone: initial.phone || '',
        sponsorType: initial.sponsorType,
        amount: String(initial.amount),
        status: initial.status,
        startDate: initial.startDate ? String(initial.startDate).slice(0, 10) : '',
        endDate: initial.endDate ? String(initial.endDate).slice(0, 10) : '',
        isRecurring: initial.isRecurring ?? false,
        notes: initial.notes || '',
      });
    } else {
      setForm({ ...emptyForm, episodeId: episodes[0]?.id || 0 });
    }
    setErrors({});
  }, [initial, open, episodes]);

  if (!open) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nom requis';
    if (!form.episodeId) e.episodeId = 'Épisode requis';
    if (!form.amount || Number(form.amount) < 0) e.amount = 'Montant invalide';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{initial ? 'Modifier le sponsor' : 'Nouveau sponsor'}</h2>
          <button onClick={onClose} className="btn-ghost"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <Input label="Nom du sponsor *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <Input label="Nom du contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
            <Input label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Select label="Épisode lié *" value={form.episodeId} onChange={(e) => setForm({ ...form, episodeId: Number(e.target.value) })} error={errors.episodeId}>
            <option value={0}>— Sélectionner —</option>
            {episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.title || `Épisode #${ep.episodeNumber || ep.id}`}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.sponsorType} onChange={(e) => setForm({ ...form, sponsorType: e.target.value })}>
              <option value="preroll">Preroll</option>
              <option value="midroll">Midroll</option>
              <option value="postroll">Postroll</option>
              <option value="mention">Mention</option>
              <option value="partenaire">Partenaire</option>
            </Select>
            <Input label="Montant (MAD) *" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={errors.amount} />
          </div>
          <Select label="Statut" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="prospect">Prospect</option>
            <option value="contacte">Contacté</option>
            <option value="nego">En négociation</option>
            <option value="confirme">Confirmé</option>
            <option value="refuse">Refusé</option>
            <option value="partenaire_recurrent">Partenaire récurrent ⭐</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date début" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="Date fin" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="rounded" />
            Partenaire récurrent
          </label>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>

        <div className="flex gap-3 mt-6">
          <GlowButton className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </GlowButton>
          <GlowButton variant="ghost" onClick={onClose}>Annuler</GlowButton>
        </div>
      </motion.div>
    </div>
  );
}
