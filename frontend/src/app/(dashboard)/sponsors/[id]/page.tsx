'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Play, Pause, XCircle } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Input } from '@/components/ui/Input';
import { GlowButton } from '@/components/ui/GlowButton';
import { SponsorContractModal } from '@/components/sponsors/SponsorContractModal';
import { SponsorConflictModal } from '@/components/sponsors/SponsorConflictModal';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS } from '@/lib/sponsor-utils';
import { formatNumber } from '@/lib/utils';
import type { SponsorConflictDetails, SponsorContract } from '@/types';

export default function SponsorDetailPage() {
  const params = useParams();
  const sponsorId = Number(params.id);
  const qc = useQueryClient();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SponsorContract | null>(null);
  const [conflict, setConflict] = useState<SponsorConflictDetails | null>(null);

  const { data: sponsor, isLoading } = useQuery({
    queryKey: ['sponsor', sponsorId],
    queryFn: () => api.sponsors.get(sponsorId),
    enabled: !!sponsorId,
  });

  const { data: contractsData } = useQuery({
    queryKey: ['sponsor-contracts', sponsorId],
    queryFn: () => api.sponsorContracts.list({ sponsorId, limit: 50 }),
    enabled: !!sponsorId,
  });

  const contracts = contractsData?.data ?? [];

  const updateBrand = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.sponsors.update(sponsorId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsor', sponsorId] });
      toast.success('Marque mise à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleApiConflict = (e: unknown): boolean => {
    if (e instanceof ApiError && e.status === 409 && e.conflict) {
      setConflict(e.conflict);
      return true;
    }
    return false;
  };

  const saveContract = async (data: Record<string, unknown>) => {
    try {
      if (editing) await api.sponsorContracts.update(editing.id, data);
      else await api.sponsorContracts.create(data);
      qc.invalidateQueries({ queryKey: ['sponsor-contracts', sponsorId] });
      toast.success(editing ? 'Contrat mis à jour' : 'Contrat créé');
    } catch (e) {
      if (!handleApiConflict(e)) throw e;
    }
  };

  const activate = useMutation({
    mutationFn: (id: number) => api.sponsorContracts.activate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsor-contracts', sponsorId] });
      toast.success('Contrat activé');
    },
    onError: (e: Error) => {
      if (handleApiConflict(e)) return;
      toast.error(e.message);
    },
  });

  const pause = useMutation({
    mutationFn: (id: number) => api.sponsorContracts.pause(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sponsor-contracts', sponsorId] }),
  });

  const cancel = useMutation({
    mutationFn: (id: number) => api.sponsorContracts.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sponsor-contracts', sponsorId] }),
  });

  if (isLoading || !sponsor) {
    return (
      <div>
        <TopBar title="Sponsor" showSearch={false} />
        <div className="skeleton h-40" />
      </div>
    );
  }

  const confirmedRevenue = contracts
    .filter((c) => c.contractStatus === 'active' || c.crmStatus === 'confirme')
    .reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <TopBar title={sponsor.name} showSearch={false} />
      <Link href="/sponsors" className="inline-flex items-center gap-1.5 text-sm text-violet-400 mb-4 min-h-[44px]">
        <ArrowLeft className="w-4 h-4" /> Retour aux sponsors
      </Link>

      <div className="glass-panel p-4 md:p-6 mb-4 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Marque</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Nom" defaultValue={sponsor.name} id="sponsor-name" />
          <Input label="Niche" defaultValue={sponsor.niche || ''} id="sponsor-niche" />
          <Input label="Site web" defaultValue={sponsor.websiteUrl || ''} id="sponsor-website" />
          <Input label="Logo URL" defaultValue={sponsor.logoUrl || ''} id="sponsor-logo" />
        </div>
        <GlowButton
          size="sm"
          onClick={() => {
            const name = (document.getElementById('sponsor-name') as HTMLInputElement)?.value;
            const niche = (document.getElementById('sponsor-niche') as HTMLInputElement)?.value;
            const websiteUrl = (document.getElementById('sponsor-website') as HTMLInputElement)?.value;
            const logoUrl = (document.getElementById('sponsor-logo') as HTMLInputElement)?.value;
            updateBrand.mutate({ name, niche, websiteUrl, logoUrl });
          }}
        >
          Enregistrer la marque
        </GlowButton>
        <div className="flex gap-4 text-sm pt-2 border-t border-[var(--border-subtle)]">
          <span>Revenus actifs : <b className="text-emerald-400">{formatNumber(confirmedRevenue)}</b></span>
          <span>Épisodes : <b>{contracts.reduce((s, c) => s + (c.episodes?.length ?? 0), 0)}</b></span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-lg font-bold">Contrats</h2>
        <div className="flex gap-2">
          <Link href="/sponsors/youtube-logs" className="btn-secondary text-xs min-h-[36px] px-3">Logs YouTube</Link>
          <button
            type="button"
            className="btn-primary min-h-[36px]"
            onClick={() => { setEditing(null); setModalOpen(true); }}
          >
            <Plus className="w-4 h-4" /> Nouveau
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {contracts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">Aucun contrat.</p>
        ) : (
          contracts.map((c) => (
            <div key={c.id} className="glass-panel p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{CONTRACT_TYPE_LABELS[c.contractType] || c.contractType}</span>
                    <span className="badge badge-violet text-[9px]">{CONTRACT_STATUS_LABELS[c.contractStatus]}</span>
                    <span className="badge badge-muted text-[9px]">{c.crmStatus}</span>
                  </div>
                  <p className="text-emerald-400 font-bold tabular-nums">{formatNumber(Number(c.amount))} {c.currency}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    {c.startDate ? new Date(c.startDate).toLocaleDateString('fr-FR') : '—'}
                    {' → '}
                    {c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '∞'}
                  </p>
                  <p className="text-[11px] text-[var(--text-dimmed)] mb-2">
                    {c.episodes?.length ?? 0} épisode(s) sponsorisé(s)
                  </p>
                  {(c.episodes?.length ?? 0) > 0 && (
                    <ul className="space-y-1.5 border-t border-[var(--border-subtle)] pt-2">
                      {c.episodes!.map((link) => {
                        const ep = link.episode;
                        const guest = ep?.guest;
                        const label = ep?.title
                          || (guest ? `${guest.firstName} ${guest.lastName}` : `Épisode #${link.episodeId}`);
                        const guestId = guest?.id;
                        return (
                          <li key={link.id} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-[var(--text-secondary)] truncate">
                              {ep?.episodeNumber != null && (
                                <span className="text-[var(--text-dimmed)] mr-1">#{ep.episodeNumber}</span>
                              )}
                              {label}
                            </span>
                            {guestId ? (
                              <Link href={`/guests/${guestId}`} className="text-violet-400 hover:underline shrink-0">
                                Voir
                              </Link>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button type="button" className="btn-ghost text-xs px-2" onClick={() => { setEditing(c); setModalOpen(true); }}>Modifier</button>
                  {c.contractStatus !== 'active' && (
                    <button type="button" className="btn-ghost text-xs px-2 text-emerald-400" onClick={() => activate.mutate(c.id)}>
                      <Play className="w-3 h-3 inline" /> Activer
                    </button>
                  )}
                  {c.contractStatus === 'active' && (
                    <button type="button" className="btn-ghost text-xs px-2" onClick={() => pause.mutate(c.id)}>
                      <Pause className="w-3 h-3 inline" /> Pause
                    </button>
                  )}
                  <button type="button" className="btn-ghost text-xs px-2 text-red-400" onClick={() => cancel.mutate(c.id)}>
                    <XCircle className="w-3 h-3 inline" /> Annuler
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <SponsorContractModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sponsorId={sponsorId}
        initial={editing}
        onSubmit={saveContract}
      />
      <SponsorConflictModal
        open={!!conflict}
        conflict={conflict}
        onClose={() => setConflict(null)}
      />
    </div>
  );
}
