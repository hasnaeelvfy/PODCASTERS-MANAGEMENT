'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DollarSign, Users, Handshake, Star, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { KpiCardSkeleton } from '@/components/ui/Skeleton';
import { SponsorModal, type SponsorFormData } from '@/components/sponsors/SponsorModal';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/hooks/usePermissions';
import { formatNumber, SPONSOR_STATUS_LABELS } from '@/lib/utils';
import type { Sponsor } from '@/types';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    prospect: 'badge-muted', contacte: 'badge-blue', nego: 'badge-gold',
    confirme: 'badge-success', refuse: 'badge-danger', partenaire_recurrent: 'badge-violet',
  };
  return map[status] || 'badge-muted';
}

export default function SponsorsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['sponsor-stats'],
    queryFn: () => api.sponsors.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sponsors', search, statusFilter],
    queryFn: () => api.sponsors.list({ search: search || undefined, status: statusFilter || undefined, limit: 50 }),
  });

  const { data: episodes = [] } = useQuery({
    queryKey: ['episodes'],
    queryFn: () => api.episodes.list(),
  });

  const createMutation = useMutation({
    mutationFn: (d: SponsorFormData) => api.sponsors.create({
      episodeId: d.episodeId,
      name: d.name,
      contactName: d.contactName || undefined,
      email: d.email || undefined,
      phone: d.phone || undefined,
      sponsorType: d.sponsorType,
      amount: Number(d.amount),
      status: d.status,
      startDate: d.startDate || undefined,
      endDate: d.endDate || undefined,
      isRecurring: d.isRecurring,
      notes: d.notes || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sponsors'] }); qc.invalidateQueries({ queryKey: ['sponsor-stats'] }); toast.success('Sponsor créé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: SponsorFormData }) => api.sponsors.update(id, {
      episodeId: d.episodeId, name: d.name, contactName: d.contactName || undefined,
      email: d.email || undefined, phone: d.phone || undefined, sponsorType: d.sponsorType,
      amount: Number(d.amount), status: d.status, startDate: d.startDate || undefined,
      endDate: d.endDate || undefined, isRecurring: d.isRecurring, notes: d.notes || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sponsors'] }); qc.invalidateQueries({ queryKey: ['sponsor-stats'] }); toast.success('Sponsor mis à jour'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.sponsors.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sponsors'] }); qc.invalidateQueries({ queryKey: ['sponsor-stats'] }); toast.success('Sponsor supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = async (form: SponsorFormData) => {
    if (editing) await updateMutation.mutateAsync({ id: editing.id, d: form });
    else await createMutation.mutateAsync(form);
  };

  const sponsors = data?.data || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <TopBar title="Sponsors" showSearch={false} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statsLoading ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />) : stats && (
          <>
            <KpiCard label="Revenus confirmés" value={`${formatNumber(stats.totalConfirmedRevenue)} MAD`} icon={DollarSign} accent="green" />
            <KpiCard label="Sponsors actifs" value={stats.activeSponsors} icon={Users} accent="blue" />
            <KpiCard label="En négociation" value={`${formatNumber(stats.inNegotiationAmount)} MAD`} icon={Handshake} accent="orange" />
            <KpiCard label="Meilleur sponsor" value={stats.topSponsor?.name || '—'} icon={Star} accent="purple" />
          </>
        )}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-xl px-3 h-11 flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="w-4 h-4 text-[var(--text-muted)]" />
          <input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full text-[var(--text-primary)]" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="input-base h-11 w-full sm:w-auto text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(SPONSOR_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canCreate && (
        <button type="button" className="btn-primary min-h-[48px] w-full sm:w-auto justify-center" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4" /> Ajouter
        </button>
        )}
      </div>

      {/* List (mobile) / Table (desktop) */}
      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Chargement...</div>
        ) : sponsors.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">Aucun sponsor trouvé.</p>
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-[var(--border-subtle)]">
              {sponsors.map((s: Sponsor) => (
                <div key={s.id} className="p-4 flex items-start gap-3 min-h-[72px] active:bg-white/[0.02]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {s.name}{s.isRecurring ? ' ⭐' : ''}
                      </p>
                      <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0">
                        {formatNumber(Number(s.amount))}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className={`badge text-[9px] ${statusBadge(s.status)}`}>
                        {SPONSOR_STATUS_LABELS[s.status] || s.status}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] truncate">
                        {s.episode?.title || `Ép. #${s.episodeId}`}
                      </span>
                    </div>
                    {(s.contactName || s.email) && (
                      <p className="text-[10px] text-[var(--text-dimmed)] mt-1 truncate">
                        {s.contactName || s.email}
                      </p>
                    )}
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="flex flex-col gap-1 shrink-0">
                      {canEdit && (
                        <button
                          type="button"
                          className="btn-ghost p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          onClick={() => { setEditing(s); setModalOpen(true); }}
                          aria-label="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="btn-ghost p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400"
                          onClick={() => deleteMutation.mutate(s.id)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="text-left p-4">Nom</th>
                    <th className="text-left p-4">Contact</th>
                    <th className="text-left p-4 hidden lg:table-cell">Épisode</th>
                    <th className="text-right p-4">Montant</th>
                    <th className="text-center p-4">Statut</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsors.map((s: Sponsor) => (
                    <tr key={s.id} className="border-b border-[var(--border-subtle)] hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-semibold">{s.name}{s.isRecurring ? ' ⭐' : ''}</td>
                      <td className="p-4 text-[var(--text-muted)]">{s.contactName || s.email || '—'}</td>
                      <td className="p-4 text-[var(--text-muted)] hidden lg:table-cell truncate max-w-[160px]">
                        {s.episode?.title || `Ép. #${s.episodeId}`}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-400 tabular-nums">{formatNumber(Number(s.amount))} MAD</td>
                      <td className="p-4 text-center">
                        <span className={`badge text-[9px] ${statusBadge(s.status)}`}>{SPONSOR_STATUS_LABELS[s.status] || s.status}</span>
                      </td>
                      <td className="p-4 text-right">
                        {(canEdit || canDelete) && (
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                          <button className="btn-ghost p-2" onClick={() => { setEditing(s); setModalOpen(true); }}><Pencil className="w-3.5 h-3.5" /></button>
                          )}
                          {canDelete && (
                          <button className="btn-ghost p-2 text-red-400" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <SponsorModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} episodes={episodes} initial={editing} />
    </motion.div>
  );
}
