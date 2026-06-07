'use client';

import { useState } from 'react';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { GlowButton } from '@/components/ui/GlowButton';
import type { Guest, PipelineStage } from '@/types';
import { LANGUAGE_LABELS } from '@/lib/utils';

interface GuestFormProps {
  guest?: Partial<Guest>;
  stages: PipelineStage[];
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function GuestForm({ guest, stages, onSubmit, onCancel, loading }: GuestFormProps) {
  const [form, setForm] = useState({
    firstName: guest?.firstName || '',
    lastName: guest?.lastName || '',
    company: guest?.company || '',
    sector: guest?.sector || '',
    city: guest?.city || '',
    source: guest?.source || '',
    contact: guest?.contact || '',
    language: guest?.language || 'adefini',
    stageId: guest?.stageId || stages[0]?.id || 1,
    shootingDate: guest?.shootingDate
      ? new Date(guest.shootingDate).toISOString().slice(0, 16)
      : '',
    whyElmaakoul: guest?.whyElmaakoul || '',
    emotionalAngle: guest?.emotionalAngle || '',
    notes: guest?.notes || '',
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...form,
          stageId: Number(form.stageId),
          shootingDate: form.shootingDate || null,
        });
      }}
      className="bg-surface border border-white/[0.06] rounded-[4px] p-6 md:p-8"
    >
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/[0.06]">
        <span className="section-number">—</span>
        <h2 className="text-sm font-black tracking-tight uppercase">Nouvel invité</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input label="Prénom" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
        <Input label="Nom" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        <Input label="Entreprise" value={form.company} onChange={(e) => set('company', e.target.value)} />
        <Input label="Secteur" value={form.sector} onChange={(e) => set('sector', e.target.value)} />
        <Input label="Ville" value={form.city} onChange={(e) => set('city', e.target.value)} />
        <Input label="Source" value={form.source} onChange={(e) => set('source', e.target.value)} />
        <Input label="Contact" value={form.contact} onChange={(e) => set('contact', e.target.value)} />
        <Select label="Langue" value={form.language} onChange={(e) => set('language', e.target.value)}>
          {Object.entries(LANGUAGE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select label="Stade" value={form.stageId} onChange={(e) => set('stageId', e.target.value)}>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Input
          label="Créneau tournage"
          type="datetime-local"
          value={form.shootingDate}
          onChange={(e) => set('shootingDate', e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3 mt-8 mb-5 pb-5 border-b border-white/[0.06]">
        <span className="section-number">02 —</span>
        <h2 className="text-sm font-black tracking-tight uppercase">Informations de tournage</h2>
      </div>

      <Textarea
        label="Pourquoi El Maakoul"
        value={form.whyElmaakoul}
        onChange={(e) => set('whyElmaakoul', e.target.value)}
      />
      <Textarea
        label="Angle émotionnel"
        value={form.emotionalAngle}
        onChange={(e) => set('emotionalAngle', e.target.value)}
      />
      <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />

      <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-white/[0.06]">
        <GlowButton type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </GlowButton>
        <GlowButton type="submit" disabled={loading}>
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </GlowButton>
      </div>
    </form>
  );
}
