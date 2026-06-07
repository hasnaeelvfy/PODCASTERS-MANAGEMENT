'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Textarea } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Interaction } from '@/types';

export function InteractionsList({
  guestId,
  interactions,
}: {
  guestId: number;
  interactions: Interaction[];
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.guests.addInteraction(guestId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest', guestId] });
      setNote('');
      setOpen(false);
    },
  });

  return (
    <GlowCard>
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-blue" />
          <h3 className="section-title">Journal des interactions</h3>
        </div>
        <GlowButton size="sm" onClick={() => setOpen(!open)}>
          + Note
        </GlowButton>
      </div>
      {open && (
        <div className="mb-5 p-4 rounded-[4px] bg-bg-elevated/50 border border-white/[0.06]">
          <Textarea
            placeholder="Note, relance, prochain pas..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2 justify-end mt-3">
            <GlowButton size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </GlowButton>
            <GlowButton
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={!note.trim() || mutation.isPending}
            >
              Ajouter
            </GlowButton>
          </div>
        </div>
      )}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {interactions.length === 0 && (
          <p className="text-xs text-slate-muted py-4 text-center">Aucune interaction</p>
        )}
        {[...interactions]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((i) => (
            <div
              key={i.id}
              className="border-l-2 border-brand-yellow/50 pl-4 py-2 rounded-r-lg hover:bg-white/[0.02] transition-colors"
            >
              <p className="text-[10px] text-slate-muted font-medium uppercase tracking-wide">
                {formatDate(i.createdAt)}
              </p>
              <p className="text-sm text-slate-soft mt-1 leading-relaxed">{i.note}</p>
            </div>
          ))}
      </div>
    </GlowCard>
  );
}
