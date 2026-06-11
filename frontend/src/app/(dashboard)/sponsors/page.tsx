'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { DollarSign, Users, Handshake, Star, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { KpiCardSkeleton } from '@/components/ui/Skeleton';
import { SponsorModal, type SponsorFormData } from '@/components/sponsors/SponsorModal';
import { SponsorConflictModal } from '@/components/sponsors/SponsorConflictModal';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { api, ApiError } from '@/lib/api';
import { sponsorDeleteMessage } from '@/lib/delete-messages';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/hooks/usePermissions';
import { CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS } from '@/lib/sponsor-utils';
import { formatNumber, SPONSOR_STATUS_LABELS } from '@/lib/utils';
import type { Sponsor, SponsorConflictDetails } from '@/types';

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
  const [contractStatusFilter, setContractStatusFilter] = useState('');
  const [contractTypeFilter, setContractTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [conflict, setConflict] = useState<SponsorConflictDetails | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sponsor | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['sponsor-stats'],
    queryFn: () => api.sponsors.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sponsors', search, statusFilter, contractStatusFilter, contractTypeFilter],
    queryFn: () => api.sponsors.list({
      search: search || undefined,
      status: statusFilter || undefined,
      contractStatus: contractStatusFilter || undefined,
      contractType: contractTypeFilter || undefined,
      limit: 50,
    }),
  });

  const { data: episodes = [] } = useQuery({
    queryKey: ['episodes'],
    queryFn: () => api.episodes.list(),
  });

  const createMutation = useMutation({
    mutationFn: (d: SponsorFormData) => api.sponsors.create({
      episodeId: d.episodeIds[0] || d.episodeId,
      episodeIds: d.episodeIds,
      name: d.name,
      contactName: d.contactName || undefined,
      email: d.email || undefined,
      phone: d.phone || undefined,
      sponsorType: d.sponsorType,
      contractType: d.contractType,
      amount: Number(d.amount),
      status: d.status,
      startDate: d.startDate || undefined,
      endDate: d.endDate || undefined,
      isRecurring: d.isRecurring,
      notes: d.notes || undefined,
      trackingUrl: d.trackingUrl || undefined,
      promoMessage: d.promoMessage || undefined,
      autoUpdateYoutube: d.autoUpdateYoutube,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sponsors'] }); qc.invalidateQueries({ queryKey: ['sponsor-stats'] }); toast.success('Sponsor créé'); },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.status === 409 && e.conflict) return;
      toast.error(e.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: SponsorFormData }) => api.sponsors.update(id, {
      episodeId: d.episodeId,
      episodeIds: d.episodeIds && d.episodeIds.length > 0 ? d.episodeIds : undefined,
      name: d.name, contactName: d.contactName || undefined,
      email: d.email || undefined, phone: d.phone || undefined, sponsorType: d.sponsorType,
      amount: Number(d.amount), status: d.status, startDate: d.startDate || undefined,
      endDate: d.endDate || undefined, isRecurring: d.isRecurring, notes: d.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsors'] });
      qc.invalidateQueries({ queryKey: ['sponsor-stats'] });
      qc.invalidateQueries({ queryKey: ['episodes'] });
      qc.invalidateQueries({ queryKey: ['guests'] });
      toast.success('Sponsor mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.sponsors.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsors'] });
      qc.invalidateQueries({ queryKey: ['sponsor-stats'] });
      qc.invalidateQueries({ queryKey: ['episodes'] });
      qc.invalidateQueries({ queryKey: ['guests'] });
      setDeleteTarget(null);
      toast.success('Sponsor supprimé');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
  };

  const handleSubmit = async (form: SponsorFormData) => {
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, d: form });
      else await createMutation.mutateAsync(form);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.conflict) {
        setConflict(e.conflict);
        return;
      }
      throw e;
    }
  };

  const sponsors = data?.data || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 max-w-full overflow-x-hidden">
      <TopBar title="Sponsors" showSearch={false} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6 min-w-0">
        {statsLoading ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />) : stats && (
          <>
            <KpiCard compact label="Revenus confirmés" value={`${formatNumber(stats.totalConfirmedRevenue)} MAD`} icon={DollarSign} accent="green" />
            <KpiCard compact label="Sponsors actifs" value={stats.activeSponsors} icon={Users} accent="blue" />
            <KpiCard compact label="En négociation" value={`${formatNumber(stats.inNegotiationAmount)} MAD`} icon={Handshake} accent="orange" />
            <KpiCard
              compact
              label="Meilleur sponsor"
              value={stats.topSponsor?.name || '—'}
              icon={Star}
              accent="purple"
            />
          </>
        )}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-col gap-3 mb-4 min-w-0">
        <div className="flex items-center gap-2.5 w-full min-w-0 h-11 px-3 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-xl focus-within:border-violet-400/40 transition-colors">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0 pointer-events-none" aria-hidden />
          <input
            type="search"
            placeholder="Rechercher un sponsor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 h-full bg-transparent text-base sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dimmed)] outline-none border-0 p-0"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base h-11 w-full text-sm rounded-xl"
          >
            <option value="">CRM — tous statuts</option>
            {Object.entries(SPONSOR_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={contractStatusFilter}
            onChange={(e) => setContractStatusFilter(e.target.value)}
            className="input-base h-11 w-full text-sm rounded-xl"
          >
            <option value="">Contrat — tous statuts</option>
            {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={contractTypeFilter}
            onChange={(e) => setContractTypeFilter(e.target.value)}
            className="input-base h-11 w-full text-sm rounded-xl"
          >
            <option value="">Tous les types</option>
            {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch min-w-0">
          {canCreate && (
            <button
              type="button"
              className="btn-primary min-h-[48px] w-full sm:w-auto sm:shrink-0 justify-center rounded-xl"
              onClick={() => { setEditing(null); setModalOpen(true); }}
            >
              <Plus className="w-4 h-4" /> Ajouter un sponsor
            </button>
          )}
        </div>
      </div>

      {/* List (mobile) / Table (desktop) */}
      <div className="glass-panel overflow-hidden min-w-0 max-w-full rounded-xl md:rounded-2xl">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Chargement...</div>
        ) : sponsors.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">Aucun sponsor trouvé.</p>
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-[var(--border-subtle)]">
              {sponsors.map((s: Sponsor) => (
                <div key={s.id} className="p-4 min-w-0 active:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/sponsors/${s.id}`} className="text-sm font-semibold text-[var(--text-primary)] truncate block hover:text-violet-300">
                        {s.name}{s.isRecurring ? ' ⭐' : ''}
                      </Link>
                      {s.niche && (
                        <p className="text-[10px] text-violet-400/80 mt-0.5">{s.niche}</p>
                      )}
                      {s.contracts && s.contracts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.contracts.slice(0, 2).map((c) => (
                            <span key={c.id} className="badge badge-violet text-[8px]">
                              {CONTRACT_TYPE_LABELS[c.contractType] || c.contractType}
                              {' · '}
                              {CONTRACT_STATUS_LABELS[c.contractStatus] || c.contractStatus}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-base font-bold text-emerald-400 tabular-nums mt-0.5">
                        {formatNumber(Number(s.amount))} MAD
                      </p>
                    </div>
                    <span className={`badge text-[9px] shrink-0 max-w-[42%] truncate ${statusBadge(s.status)}`}>
                      {SPONSOR_STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] mt-2 truncate">
                    {s.episode?.title || `Épisode #${s.episodeId}`}
                  </p>
                  {(s.contactName || s.email) && (
                    <p className="text-[10px] text-[var(--text-dimmed)] mt-1 truncate">
                      {s.contactName || s.email}
                    </p>
                  )}

                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                      {canEdit && (
                        <button
                          type="button"
                          className="btn-ghost flex-1 min-h-[44px] flex items-center justify-center gap-2 text-sm rounded-xl"
                          onClick={() => { setEditing(s); setModalOpen(true); }}
                        >
                          <Pencil className="w-4 h-4" />
                          Modifier
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="btn-ghost flex-1 min-h-[44px] flex items-center justify-center gap-2 text-sm text-red-400 rounded-xl"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
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
                    <th className="text-left p-4 hidden lg:table-cell">Contrat</th>
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
                      <td className="p-4 font-semibold">
                        <Link href={`/sponsors/${s.id}`} className="hover:text-violet-300">{s.name}</Link>
                        {s.isRecurring ? ' ⭐' : ''}
                        {s.niche && <p className="text-[10px] text-[var(--text-muted)] font-normal">{s.niche}</p>}
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        {s.contracts && s.contracts[0] ? (
                          <div className="space-y-0.5">
                            <span className="badge badge-violet text-[9px]">
                              {CONTRACT_TYPE_LABELS[s.contracts[0].contractType]}
                            </span>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              {CONTRACT_STATUS_LABELS[s.contracts[0].contractStatus]}
                              {s.contracts[0]._count?.episodes != null && ` · ${s.contracts[0]._count.episodes} ép.`}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[var(--text-dimmed)]">—</span>
                        )}
                      </td>
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
                          <button className="btn-ghost p-2 text-red-400" onClick={() => setDeleteTarget(s)}><Trash2 className="w-3.5 h-3.5" /></button>
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
      <SponsorConflictModal
        open={!!conflict}
        conflict={conflict}
        onClose={() => setConflict(null)}
      />
      <ConfirmDeleteModal
        open={!!deleteTarget}
        message={deleteTarget ? sponsorDeleteMessage(deleteTarget.name) : ''}
        loading={deleteMutation.isPending}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </motion.div>
  );
}
