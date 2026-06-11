'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlowCard } from '@/components/ui/GlowCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Badge } from '@/components/ui/Badge';
import { Accordion } from '@/components/ui/Accordion';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { useIsMobile } from '@/hooks/useIsMobile';
import { InteractionsList } from '@/components/guests/InteractionsList';
import { api, ApiError } from '@/lib/api';
import type { Episode, Guest } from '@/types';
import { useConfirm } from '@/hooks/useConfirm';
import { usePermissions } from '@/hooks/usePermissions';
import { CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS } from '@/lib/sponsor-utils';
import { SponsorModal, type SponsorFormData } from '@/components/sponsors/SponsorModal';
import { SponsorConflictModal } from '@/components/sponsors/SponsorConflictModal';
import { useToast } from '@/contexts/ToastContext';
import type { SponsorConflictDetails } from '@/types';
import {
  initials,
  formatDateTime,
  formatDuration,
  LANGUAGE_LABELS,
  calcReach,
  formatNumber,
  PLATFORM_LABELS,
  SPONSOR_STATUS_LABELS,
} from '@/lib/utils';

export default function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const guestId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm, ConfirmModalComponent } = useConfirm();
  const { canEdit, canDelete } = usePermissions();
  const isMobile = useIsMobile();

  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest', guestId],
    queryFn: () => api.guests.get(guestId),
    enabled: !isNaN(guestId),
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['stages'],
    queryFn: () => api.guests.stages(),
  });

  const updateGuest = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.guests.update(guestId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guest', guestId] }),
  });

  const updateEpisode = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      guest?.episode
        ? api.episodes.update(guest.episode.id, data)
        : Promise.reject('No episode'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guest', guestId] }),
  });

  const deleteGuest = useMutation({
    mutationFn: () => api.guests.delete(guestId),
    onSuccess: () => router.push('/pipeline'),
  });

  const handleDeleteGuest = async () => {
    const confirmed = await confirm({
      title: 'Supprimer cet invité ?',
      message: 'Cette action est irréversible. Voulez-vous vraiment supprimer cet invité ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'warning',
    });
    if (confirmed) {
      deleteGuest.mutate();
    }
  };

  if (isLoading || !guest) {
    return <div className="text-white/40">Chargement...</div>;
  }

  const stage = guest.stage;
  const ep = guest.episode;
  const isPublished = stage?.position === 6;
  const isRecording = stage?.position === 5 || stage?.position === 4;
  const reach = calcReach(ep || undefined);
  const activeContractRevenue = (ep?.contractEpisodes || [])
    .filter((l) => l.contract?.contractStatus === 'active')
    .reduce((s, l) => s + Number(l.contract?.amount ?? 0), 0);
  const legacyRevenue = (ep?.sponsors || []).reduce((s, x) => s + Number(x.amount), 0);
  const revenue = activeContractRevenue > 0 ? activeContractRevenue : legacyRevenue;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 overflow-x-hidden">
      <ConfirmModalComponent />
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1.5 text-sm text-brand-yellow mb-4 md:mb-6 hover:text-brand-blue transition-colors font-medium min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>

      <GlowCard gradient className="mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-start md:justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
              style={{
                backgroundColor: `${stage?.color}22`,
                color: stage?.color,
              }}
            >
              {initials(guest.firstName, guest.lastName)}
            </div>
            <div>
              <h1 className="text-base md:text-2xl font-bold">
                {guest.firstName} {guest.lastName}
              </h1>
              <p className="text-white/50 text-sm">
                {guest.company}
                {guest.city ? ` · ${guest.city}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:flex-wrap md:items-end md:gap-3">
            {canEdit ? (
              <Select
                label="Stade"
                className="w-full md:flex-none md:min-w-[160px]"
                value={guest.stageId}
                onChange={(e) =>
                  updateGuest.mutate({ stageId: Number(e.target.value) })
                }
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="text-sm text-white/50">{stage?.name}</span>
            )}
            {(canEdit || canDelete) && (
              <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto md:ml-auto shrink-0">
                {canEdit ? (
                  <Link href={`/guests/${guestId}/edit`} className="inline-flex shrink-0">
                    <GlowButton variant="ghost" size="sm" className="!h-10 !min-h-[40px] px-4 text-sm font-medium">
                      Modifier
                    </GlowButton>
                  </Link>
                ) : (
                  <span className="md:hidden" aria-hidden />
                )}
                {canDelete && (
                  <GlowButton
                    variant="ghost"
                    size="sm"
                    className="!h-10 !min-h-[40px] shrink-0 inline-flex items-center justify-center gap-2 px-4 md:px-0 md:!w-10 md:!min-w-[40px] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg normal-case tracking-normal font-medium"
                    onClick={handleDeleteGuest}
                    aria-label="Supprimer l'invité"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span className="md:hidden">Supprimer</span>
                  </GlowButton>
                )}
              </div>
            )}
          </div>
        </div>
      </GlowCard>

      {isPublished && reach > 0 && (
        <GlowCard className="mb-6 border-brand-yellow/20">
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-sm text-brand-yellow/90 font-medium">Portée totale (D30)</span>
            <span className="text-lg md:text-3xl font-bold text-brand-yellow tabular-nums">{formatNumber(reach)}</span>
          </div>
          {revenue > 0 && (
            <p className="text-sm text-emerald-400">
              Sponsoring : <b>{formatNumber(revenue)} MAD</b>
            </p>
          )}
        </GlowCard>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-4 md:space-y-6 order-1">
          <GlowCard>
            <h3 className="text-sm font-semibold mb-4">Profil</h3>
            {guest.sector && (
              <div className="mb-3">
                <p className="text-[10px] text-white/40 uppercase">Secteur</p>
                <p className="text-sm">{guest.sector}</p>
              </div>
            )}
            <Badge>{LANGUAGE_LABELS[guest.language]}</Badge>
            {guest.source && (
              <div className="mt-3">
                <p className="text-[10px] text-white/40 uppercase">Source</p>
                <p className="text-sm">{guest.source}</p>
              </div>
            )}
            {guest.whyElmaakoul && (
              <div className="mt-3">
                <p className="text-[10px] text-white/40 uppercase">Pourquoi El Maakoul</p>
                <p className="text-sm">{guest.whyElmaakoul}</p>
              </div>
            )}
            {guest.emotionalAngle && (
              <div className="mt-3">
                <p className="text-[10px] text-white/40 uppercase">Angle émotionnel</p>
                <p className="text-sm text-brand-yellow font-medium">{guest.emotionalAngle}</p>
              </div>
            )}
            {guest.notes && (
              <div className="mt-3">
                <p className="text-[10px] text-white/40 uppercase">Notes</p>
                <p className="text-sm">{guest.notes}</p>
              </div>
            )}
          </GlowCard>

          {(isRecording || isPublished) && ep && (
            <GlowCard>
              <h3 className="text-sm font-semibold mb-4">Tournage & épisode</h3>
              {guest.shootingDate && (
                <div className="bg-amber-500/10 rounded-lg p-3 mb-4">
                  <p className="text-[10px] text-amber-400/80">Créneau prévu</p>
                  <p className="font-semibold">{formatDateTime(guest.shootingDate)}</p>
                </div>
              )}
              <EpisodeFields
                guest={guest}
                ep={ep}
                canEdit={canEdit}
                onSave={(data) => {
                  updateGuest.mutate({ shootingDate: data.shootingDate });
                  updateEpisode.mutate(data.episode);
                }}
              />
            </GlowCard>
          )}

          {isPublished && ep && (
            <>
            <GlowCard>
              <h3 className="text-sm font-semibold mb-4">Métriques podcast</h3>
              <MetricsFields
                ep={ep}
                guestId={guestId}
                canEdit={canEdit}
                onSave={(data) => updateEpisode.mutateAsync(data)}
              />
            </GlowCard>
            {(ep.youtubeEpisodeUrl || ep.lastYoutubeSync || ep.lastSyncAt) && (
              <GlowCard className="border-red-500/20">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span className="text-red-400">▶</span> Stats YouTube (auto)
                  </h3>
                  <span className="text-[10px] text-white/30">
                    Sync : {new Date(ep.lastYoutubeSync || ep.lastSyncAt!).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatItem label="Vues" value={formatNumber(ep.youtubeViews ?? 0)} color="text-red-400" />
                  <StatItem label="Likes" value={formatNumber(ep.youtubeLikes ?? 0)} color="text-pink-400" />
                  <StatItem label="Commentaires" value={formatNumber(ep.youtubeComments ?? 0)} color="text-blue-400" />
                  <StatItem label="Engagement" value={`${ep.engagementRate ?? 0}%`} color="text-amber-400" />
                  {ep.youtubeDuration ? (
                    <div className="col-span-2 p-3 rounded-xl bg-white/[0.03] border border-[var(--border-subtle)]">
                      <StatItem label="Durée" value={formatDuration(ep.youtubeDuration)} color="text-green-400" />
                    </div>
                  ) : null}
                </div>
              </GlowCard>
            )}
            </>
          )}
        </div>

        <div className="space-y-4 md:space-y-6 order-2">
          <InteractionsList
            guestId={guestId}
            interactions={guest.interactions || []}
          />
          {isPublished && ep && (
            <>
              <ShortsPanel episodeId={ep.id} shorts={ep.shorts || []} guestId={guestId} />
              <SponsorsPanel
                episodeId={ep.id}
                sponsors={ep.sponsors || []}
                contractEpisodes={ep.contractEpisodes || []}
                guestId={guestId}
                mobileAccordion={isMobile}
              />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[10px] text-white/40 uppercase">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function EpisodeFields({
  guest,
  ep,
  canEdit,
  onSave,
}: {
  guest: { shootingDate?: string | null };
  ep: { title?: string | null; episodeNumber?: number | null; recordingDate?: string | null };
  canEdit: boolean;
  onSave: (d: { shootingDate: string | null; episode: Record<string, unknown> }) => void;
}) {
  const [shootingDate, setShootingDate] = useState(
    guest.shootingDate ? new Date(guest.shootingDate).toISOString().slice(0, 16) : '',
  );
  const [title, setTitle] = useState(ep.title || '');
  const [num, setNum] = useState(ep.episodeNumber?.toString() || '');
  const [rec, setRec] = useState(
    ep.recordingDate ? String(ep.recordingDate).slice(0, 10) : '',
  );

  return (
    <div className="space-y-3">
      <Input label="Créneau" type="datetime-local" value={shootingDate} onChange={(e) => setShootingDate(e.target.value)} />
      <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Numéro" type="number" value={num} onChange={(e) => setNum(e.target.value)} />
        <Input label="Date enreg." type="date" value={rec} onChange={(e) => setRec(e.target.value)} />
      </div>
      <div className="text-right">
        {canEdit && (
        <GlowButton
          size="sm"
          onClick={() =>
            onSave({
              shootingDate: shootingDate || null,
              episode: {
                title,
                episodeNumber: parseInt(num) || null,
                recordingDate: rec || undefined,
              },
            })
          }
        >
          Enregistrer
        </GlowButton>
        )}
      </div>
    </div>
  );
}

function parseNonNegativeInt(value: string): number {
  if (value === '') return 0;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function youtubeSyncErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400 || err.status === 404) {
      return err.message.includes('YOUTUBE_API_KEY')
        ? 'Clé API YouTube manquante — configurez-la dans Paramètres'
        : 'Vidéo introuvable ou URL invalide';
    }
    if (err.status === 500) return 'Erreur serveur — vérifiez la clé API YouTube dans Paramètres';
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Impossible de récupérer les stats YouTube';
}

function mergeEpisodeYoutubeStats(guest: Guest | undefined, synced: Episode): Guest | undefined {
  if (!guest?.episode) return guest;
  return {
    ...guest,
    episode: {
      ...guest.episode,
      youtubeEpisodeUrl: synced.youtubeEpisodeUrl ?? guest.episode.youtubeEpisodeUrl,
      youtubeVideoId: synced.youtubeVideoId ?? guest.episode.youtubeVideoId,
      youtubeViews: synced.youtubeViews ?? 0,
      youtubeLikes: synced.youtubeLikes ?? 0,
      youtubeComments: synced.youtubeComments ?? 0,
      youtubeDuration: synced.youtubeDuration ?? guest.episode.youtubeDuration,
      engagementRate: synced.engagementRate ?? guest.episode.engagementRate,
      lastYoutubeSync: synced.lastYoutubeSync ?? synced.lastSyncAt ?? guest.episode.lastYoutubeSync,
      lastSyncAt: synced.lastSyncAt ?? guest.episode.lastSyncAt,
      views: synced.views ?? synced.youtubeViews ?? guest.episode.views,
      shares: synced.shares ?? guest.episode.shares,
    },
  };
}

function mergeEpisodeSpotifyStats(guest: Guest | undefined, synced: Episode): Guest | undefined {
  if (!guest?.episode) return guest;
  return {
    ...guest,
    episode: {
      ...guest.episode,
      spotifyEpisodeUrl: synced.spotifyEpisodeUrl ?? guest.episode.spotifyEpisodeUrl,
      spotifyEpisodeId: synced.spotifyEpisodeId ?? guest.episode.spotifyEpisodeId,
      listens: synced.listens ?? guest.episode.listens,
      completionRate: synced.completionRate ?? guest.episode.completionRate,
      lastSpotifySync: synced.lastSpotifySync ?? guest.episode.lastSpotifySync,
    },
  };
}

function spotifySyncErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Impossible de récupérer les stats Spotify';
}

function MetricsFields({
  ep,
  guestId,
  canEdit,
  onSave,
}: {
  ep: {
    id: number;
    listens: number;
    youtubeViews?: number;
    shares: number;
    completionRate?: string | number | null;
    publicationDate?: string | null;
    youtubeEpisodeUrl?: string | null;
    spotifyEpisodeUrl?: string | null;
    lastSpotifySync?: string | null;
  };
  guestId: number;
  canEdit: boolean;
  onSave: (d: Record<string, unknown>) => Promise<unknown>;
}) {
  const qc = useQueryClient();
  const { data: spotifyStatus } = useQuery({
    queryKey: ['spotify-status'],
    queryFn: () => api.spotify.status(),
  });
  const [form, setForm] = useState({
    listens: ep.listens,
    completion: ep.completionRate?.toString() || '',
    pub: ep.publicationDate ? String(ep.publicationDate).slice(0, 10) : '',
    youtubeEpisodeUrl: ep.youtubeEpisodeUrl || '',
    spotifyEpisodeUrl: ep.spotifyEpisodeUrl || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingViews, setLoadingViews] = useState(false);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [viewsWarning, setViewsWarning] = useState(false);
  const [spotifyWarning, setSpotifyWarning] = useState(false);
  const [displayViews, setDisplayViews] = useState(ep.youtubeViews ?? 0);
  const [displayShares, setDisplayShares] = useState(ep.shares ?? 0);
  const [displayListens, setDisplayListens] = useState(ep.listens ?? 0);
  const [displayCompletion, setDisplayCompletion] = useState(ep.completionRate?.toString() || '');

  const spotifySynced = !!ep.lastSpotifySync && !spotifyWarning;
  const spotifyReadonly = !!(spotifyStatus?.connected && spotifySynced);

  useEffect(() => {
    setDisplayViews(ep.youtubeViews ?? 0);
    setDisplayShares(ep.shares ?? 0);
    setDisplayListens(ep.listens ?? 0);
    setDisplayCompletion(ep.completionRate?.toString() || '');
  }, [ep.youtubeViews, ep.shares, ep.listens, ep.completionRate]);

  const syncYoutubeStats = useCallback(async () => {
    const url = form.youtubeEpisodeUrl.trim() || ep.youtubeEpisodeUrl || '';
    if (!url) {
      setDisplayViews(0);
      setDisplayShares(0);
      setViewsWarning(false);
      return null;
    }

    setLoadingViews(true);
    setViewsWarning(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.youtubeEpisodeUrl;
      return next;
    });

    try {
      const result = await api.youtube.syncEpisode(ep.id);
      const synced = result.episode ?? result.stats;
      if (synced) {
        setDisplayViews(synced.youtubeViews ?? 0);
        setDisplayShares(synced.shares ?? 0);
        qc.setQueryData<Guest>(['guest', guestId], (old) => mergeEpisodeYoutubeStats(old, synced));
      }
      await qc.invalidateQueries({ queryKey: ['guest', guestId] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
      return synced;
    } catch (err) {
      setDisplayViews(0);
      setDisplayShares(0);
      setViewsWarning(true);
      setErrors((prev) => ({
        ...prev,
        youtubeEpisodeUrl: youtubeSyncErrorMessage(err),
      }));
      return null;
    } finally {
      setLoadingViews(false);
    }
  }, [ep.id, ep.youtubeEpisodeUrl, form.youtubeEpisodeUrl, guestId, qc]);

  useEffect(() => {
    if (ep.youtubeEpisodeUrl) {
      syncYoutubeStats();
    }
  }, [ep.id, ep.youtubeEpisodeUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncSpotifyStats = useCallback(async () => {
    const url = form.spotifyEpisodeUrl.trim() || ep.spotifyEpisodeUrl || '';
    if (!url || !spotifyStatus?.connected) {
      setSpotifyWarning(false);
      return null;
    }

    setLoadingSpotify(true);
    setSpotifyWarning(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.spotifyEpisodeUrl;
      return next;
    });

    try {
      const url = form.spotifyEpisodeUrl.trim() || ep.spotifyEpisodeUrl || '';
      const result = await api.spotify.syncEpisode(ep.id, url || undefined);
      const synced = result.episode ?? result.stats;
      if (synced) {
        setDisplayListens(synced.listens ?? 0);
        setDisplayCompletion(synced.completionRate?.toString() || '');
        setForm((prev) => ({
          ...prev,
          listens: synced.listens ?? prev.listens,
          completion: synced.completionRate?.toString() || prev.completion,
        }));
        qc.setQueryData<Guest>(['guest', guestId], (old) => mergeEpisodeSpotifyStats(old, synced));
      }
      await qc.invalidateQueries({ queryKey: ['guest', guestId] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
      return synced;
    } catch (err) {
      setSpotifyWarning(true);
      setErrors((prev) => ({
        ...prev,
        spotifyEpisodeUrl: spotifySyncErrorMessage(err),
      }));
      return null;
    } finally {
      setLoadingSpotify(false);
    }
  }, [ep.id, ep.spotifyEpisodeUrl, form.spotifyEpisodeUrl, guestId, qc, spotifyStatus?.connected]);

  useEffect(() => {
    if (ep.spotifyEpisodeUrl && spotifyStatus?.connected) {
      syncSpotifyStats();
    }
  }, [ep.id, ep.spotifyEpisodeUrl, spotifyStatus?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (form.listens < 0) newErrors.listens = 'Valeur minimale : 0';
    if (form.completion) {
      const c = parseFloat(form.completion);
      if (Number.isNaN(c) || c < 0 || c > 100) {
        newErrors.completion = 'La complétion doit être entre 0 et 100';
      }
    }
    if (form.youtubeEpisodeUrl && !/^https?:\/\/.+/.test(form.youtubeEpisodeUrl)) {
      newErrors.youtubeEpisodeUrl = 'URL YouTube invalide';
    }
    if (form.spotifyEpisodeUrl && !/^https?:\/\/.+/.test(form.spotifyEpisodeUrl)) {
      newErrors.spotifyEpisodeUrl = 'URL Spotify invalide';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSyncing(true);
    try {
      const completionRate = form.completion
        ? Math.min(100, Math.max(0, parseFloat(form.completion)))
        : null;

      await onSave({
        listens: Math.max(0, Math.floor(form.listens)),
        completionRate,
        publicationDate: form.pub || undefined,
        youtubeEpisodeUrl: form.youtubeEpisodeUrl.trim() || undefined,
        spotifyEpisodeUrl: form.spotifyEpisodeUrl.trim() || undefined,
      });

      if (form.youtubeEpisodeUrl.trim()) {
        await syncYoutubeStats();
      } else {
        setDisplayViews(0);
        setDisplayShares(0);
        setViewsWarning(false);
      }

      if (form.spotifyEpisodeUrl.trim() && spotifyStatus?.connected) {
        await syncSpotifyStats();
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sauvegarde échouée';
      setErrors({ submit: message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-3 mobile-page-pad-form">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {spotifyReadonly ? (
          <div className="flex flex-col">
            <label className="input-label">Écoutes (Spotify)</label>
            <div className="relative">
              <input
                className="input-base bg-white/[0.03] cursor-default text-[var(--text-primary)]"
                readOnly
                value={formatNumber(displayListens)}
              />
            </div>
            <p className="text-[10px] text-white/35 mt-1">
              Récupéré automatiquement via Spotify for Creators
            </p>
          </div>
        ) : (
          <Input
            label="Écoutes (Spotify)"
            type="number"
            min={0}
            step={1}
            value={form.listens}
            disabled={!canEdit || loadingSpotify}
            error={errors.listens}
            onChange={(e) => setForm({ ...form, listens: parseNonNegativeInt(e.target.value) })}
          />
        )}
        <div className="flex flex-col">
          <label className="input-label">Vues YouTube</label>
          <div className="relative">
            <input
              className="input-base bg-white/[0.03] cursor-default text-[var(--text-primary)] pr-10"
              readOnly
              value={loadingViews ? 'Chargement…' : formatNumber(displayViews)}
              aria-busy={loadingViews}
            />
            {loadingViews && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 animate-spin" />
            )}
            {viewsWarning && !loadingViews && (
              <span title={errors.youtubeEpisodeUrl || 'Impossible de récupérer les vues YouTube'}>
                <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              </span>
            )}
          </div>
          <p className="text-[10px] text-white/35 mt-1">Récupéré automatiquement via l&apos;API YouTube</p>
        </div>
        <div className="flex flex-col">
          <label className="input-label">Partages</label>
          <div className="relative">
            <input
              className="input-base bg-white/[0.03] cursor-default text-[var(--text-primary)] pr-10"
              readOnly
              value={loadingViews ? 'Chargement…' : formatNumber(displayShares)}
              aria-busy={loadingViews}
            />
            {loadingViews && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 animate-spin" />
            )}
          </div>
          <p className="text-[10px] text-white/35 mt-1">Récupéré automatiquement via l&apos;API YouTube</p>
        </div>
        {spotifyReadonly ? (
          <div className="flex flex-col">
            <label className="input-label">Complétion %</label>
            <div className="relative">
              <input
                className="input-base bg-white/[0.03] cursor-default text-[var(--text-primary)]"
                readOnly
                value={displayCompletion ? `${displayCompletion}%` : '—'}
              />
            </div>
            <p className="text-[10px] text-white/35 mt-1">
              Récupéré automatiquement via Spotify for Creators
            </p>
          </div>
        ) : (
          <Input
            label="Complétion %"
            type="number"
            min={0}
            max={100}
            step={1}
            value={form.completion}
            disabled={!canEdit || loadingSpotify}
            error={errors.completion}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                setForm({ ...form, completion: '' });
                return;
              }
              const n = parseFloat(raw);
              if (Number.isNaN(n)) return;
              setForm({ ...form, completion: String(Math.min(100, Math.max(0, n))) });
            }}
          />
        )}
      </div>
      {spotifyWarning && (
        <p className="text-xs text-amber-400">
          Sync Spotify indisponible — saisie manuelle activée
        </p>
      )}
      {ep.lastSpotifySync && (
        <p className="text-[10px] text-white/35">
          Dernière sync Spotify : {new Date(ep.lastSpotifySync).toLocaleString('fr-FR')}
        </p>
      )}
      <Input
        label="Date publication"
        type="date"
        value={form.pub}
        disabled={!canEdit}
        onChange={(e) => setForm({ ...form, pub: e.target.value })}
      />
      <Input
        label="YouTube Episode URL"
        type="url"
        placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
        value={form.youtubeEpisodeUrl}
        disabled={!canEdit}
        onChange={(e) => setForm({ ...form, youtubeEpisodeUrl: e.target.value })}
        error={errors.youtubeEpisodeUrl}
      />
      <Input
        label="Spotify Episode URL"
        type="url"
        placeholder="https://open.spotify.com/episode/..."
        value={form.spotifyEpisodeUrl}
        disabled={!canEdit}
        onChange={(e) => setForm({ ...form, spotifyEpisodeUrl: e.target.value })}
        error={errors.spotifyEpisodeUrl}
      />
      {canEdit && spotifyStatus?.connected && form.spotifyEpisodeUrl.trim() && (
        <div className="flex justify-end">
          <GlowButton
            size="sm"
            variant="secondary"
            onClick={() => syncSpotifyStats()}
            disabled={loadingSpotify || syncing}
          >
            {loadingSpotify ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> Sync Spotify…
              </>
            ) : (
              'Synchroniser Spotify'
            )}
          </GlowButton>
        </div>
      )}
      <div className="hidden md:flex items-center justify-end gap-3 pt-1">
        {errors.submit && (
          <span className="text-xs text-red-400">{errors.submit}</span>
        )}
        {(syncing || loadingViews || loadingSpotify) && (
          <span className="text-xs text-violet-400/80">
            {loadingSpotify ? 'Sync Spotify…' : 'Sync YouTube…'}
          </span>
        )}
        {saved && <span className="text-xs text-emerald-400">Sauvegardé ✓</span>}
        {canEdit && (
          <GlowButton size="sm" onClick={handleSave} disabled={syncing || loadingViews || loadingSpotify}>
            Sauvegarder
          </GlowButton>
        )}
      </div>

      {canEdit && (
        <div className="mobile-sticky-footer md:hidden">
          <div className="flex items-center justify-between gap-2 mb-2 min-h-[20px]">
            {errors.submit ? (
              <span className="text-xs text-red-400 truncate">{errors.submit}</span>
            ) : (syncing || loadingViews || loadingSpotify) ? (
              <span className="text-xs text-violet-400/80">
                {loadingSpotify ? 'Sync Spotify…' : 'Sync YouTube…'}
              </span>
            ) : saved ? (
              <span className="text-xs text-emerald-400">Sauvegardé ✓</span>
            ) : (
              <span className="text-[10px] text-[var(--text-dimmed)]">Métriques & URLs</span>
            )}
          </div>
          <GlowButton className="w-full min-h-[48px]" onClick={handleSave} disabled={syncing || loadingViews || loadingSpotify}>
            Sauvegarder
          </GlowButton>
        </div>
      )}
    </div>
  );
}

function ShortsPanel({
  episodeId,
  shorts,
  guestId,
}: {
  episodeId: number;
  shorts: { 
    id: number; 
    platform: string; 
    title?: string | null; 
    url?: string | null; 
    views: number;
    likes: number;
    shares: number;
    description?: string | null;
    publishedAt?: string | null;
  }[];
  guestId: number;
}) {
  const qc = useQueryClient();
  const { canCreate, canDelete } = usePermissions();
  const { confirm, ConfirmModalComponent } = useConfirm();
  const totalViews = shorts.reduce((s, x) => s + x.views, 0);
  const [isAdding, setIsAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    platform: 'youtube_shorts' as string,
    title: '',
    url: '',
    description: '',
    views: 0,
    likes: 0,
    shares: 0,
    publishedAt: new Date().toISOString().slice(0, 10),
  });

  const handleAddShort = async () => {
    const newErrors: Record<string, string> = {};
    
    // Validation
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.url.trim()) newErrors.url = 'URL is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (form.url && !/^https?:\/\/.+/.test(form.url)) newErrors.url = 'URL must be a valid URL starting with http:// or https://';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    
    try {
      await api.shorts.create({
        episodeId,
        platform: form.platform,
        title: form.title,
        url: form.url,
        description: form.description,
        views: form.views,
        likes: form.likes,
        shares: form.shares,
        publishedAt: form.publishedAt,
      });
      qc.invalidateQueries({ queryKey: ['guest', guestId] });
      setIsAdding(false);
      setForm({
        platform: 'youtube_shorts',
        title: '',
        url: '',
        description: '',
        views: 0,
        likes: 0,
        shares: 0,
        publishedAt: new Date().toISOString().slice(0, 10),
      });
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save short' });
    }
  };

  const handleDeleteShort = async (id: number) => {
    const confirmed = await confirm({
      title: 'Supprimer ce short/reel ?',
      message: 'Cette action est irréversible. Voulez-vous vraiment supprimer cet élément ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.shorts.delete(id);
      qc.invalidateQueries({ queryKey: ['guest', guestId] });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Échec de la suppression' });
    }
  };

  const platformLabels: Record<string, string> = {
    youtube_shorts: 'YouTube Shorts',
    instagram_reels: 'Instagram Reels',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
  };

  return (
    <GlowCard>
      <ConfirmModalComponent />
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold">Shorts & Reels</h3>
        {totalViews > 0 && <span className="text-xs text-[var(--text-muted)]">{formatNumber(totalViews)} total views</span>}
      </div>

      {shorts.length === 0 && !isAdding && (
        <p className="text-sm text-[var(--text-muted)] py-4">Aucun short ou reel ajouté.</p>
      )}

      {shorts.map((s) => (
        <div key={s.id} className="card p-3 mb-2">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <span className="badge badge-blue text-[9px] mb-1">{platformLabels[s.platform] || s.platform}</span>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</p>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-300 hover:opacity-70">
                  {s.url}
                </a>
              )}
            </div>
            {canDelete && (
            <button
              onClick={() => handleDeleteShort(s.id)}
              className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
            >
              Supprimer
            </button>
            )}
          </div>
          {s.description && (
            <p className="text-xs text-[var(--text-muted)] mb-2">{s.description}</p>
          )}
          <div className="flex gap-4 text-xs text-[var(--text-muted)]">
            <span>👁 {formatNumber(s.views)}</span>
            <span>❤ {formatNumber(s.likes)}</span>
            <span>📤 {formatNumber(s.shares)}</span>
            {s.publishedAt && <span>📅 {new Date(s.publishedAt).toLocaleDateString('fr-FR')}</span>}
          </div>
        </div>
      ))}

      {isAdding ? (
        <div className="card p-4 space-y-3">
          <h4 className="text-sm font-semibold">Add New Short/Reel</h4>
          
          <div>
            <label className="input-label">Platform *</label>
            <select
              className="input-base"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              <option value="youtube_shorts">YouTube Shorts</option>
              <option value="instagram_reels">Instagram Reels</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>

          <div>
            <label className="input-label">Title *</label>
            <input
              className="input-base"
              type="text"
              placeholder="Enter title..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="input-label">URL *</label>
            <input
              className="input-base"
              type="url"
              placeholder="https://..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            {errors.url && <p className="text-xs text-red-400 mt-1">{errors.url}</p>}
          </div>

          <div>
            <label className="input-label">Description *</label>
            <textarea
              className="input-base"
              rows={3}
              placeholder="Enter description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="input-label">Views</label>
              <input
                className="input-base"
                type="number"
                min="0"
                value={form.views}
                onChange={(e) => setForm({ ...form, views: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="input-label">Likes</label>
              <input
                className="input-base"
                type="number"
                min="0"
                value={form.likes}
                onChange={(e) => setForm({ ...form, likes: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="input-label">Shares</label>
              <input
                className="input-base"
                type="number"
                min="0"
                value={form.shares}
                onChange={(e) => setForm({ ...form, shares: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Published At *</label>
            <input
              className="input-base"
              type="date"
              value={form.publishedAt}
              onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
            />
          </div>

          {errors.submit && <p className="text-xs text-red-400">{errors.submit}</p>}

          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={handleAddShort}>
              Save
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setIsAdding(false);
                setErrors({});
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : canCreate ? (
        <button
          className="btn-primary w-full"
          onClick={() => setIsAdding(true)}
        >
          + Add Short/Reel
        </button>
      ) : null}
    </GlowCard>
  );
}

function SponsorsPanel({
  episodeId,
  sponsors,
  contractEpisodes = [],
  guestId,
  mobileAccordion = false,
}: {
  episodeId: number;
  sponsors: {
    id: number;
    name: string;
    amount: string | number;
    status: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  }[];
  contractEpisodes?: import('@/types').ContractEpisode[];
  guestId: number;
  mobileAccordion?: boolean;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { canCreate } = usePermissions();
  const contractRows = contractEpisodes
    .map((l) => l.contract)
    .filter((c): c is NonNullable<typeof c> => Boolean(c?.sponsor));
  const contractTotal = contractRows.reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const legacyTotal = sponsors.reduce((s, x) => s + Number(x.amount), 0);
  const total = contractRows.length > 0 ? contractTotal : legacyTotal;
  const hasAny = sponsors.length > 0 || contractRows.length > 0;
  const [modalOpen, setModalOpen] = useState(false);
  const [conflict, setConflict] = useState<SponsorConflictDetails | null>(null);

  const { data: episodes = [] } = useQuery({
    queryKey: ['episodes'],
    queryFn: () => api.episodes.list(),
    enabled: modalOpen,
  });

  const createMutation = useMutation({
    mutationFn: (d: SponsorFormData) => api.sponsors.create({
      episodeId: d.episodeIds[0] || d.episodeId || episodeId,
      episodeIds: d.episodeIds.length ? d.episodeIds : [episodeId],
      name: d.name,
      contactName: d.contactName || undefined,
      email: d.email || undefined,
      phone: d.phone || undefined,
      sponsorType: d.sponsorType,
      contractType: d.contractType || 'per_episode',
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest', guestId] });
      qc.invalidateQueries({ queryKey: ['sponsors'] });
      qc.invalidateQueries({ queryKey: ['sponsor-stats'] });
      qc.invalidateQueries({ queryKey: ['episodes'] });
      toast.success('Sponsor créé');
      setModalOpen(false);
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.status === 409 && e.conflict) return;
      toast.error(e.message);
    },
  });

  const handleSubmit = async (form: SponsorFormData) => {
    try {
      await createMutation.mutateAsync(form);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.conflict) {
        setConflict(e.conflict);
        return;
      }
      throw e;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirme': return 'text-emerald-400';
      case 'nego': return 'text-amber-400';
      case 'refuse': return 'text-red-400';
      case 'paye': return 'text-cyan-400';
      default: return 'text-[var(--text-muted)]';
    }
  };

  const panelBody = (
    <>
      {!hasAny && !modalOpen && (
        <p className="text-sm text-[var(--text-muted)] py-2 mb-2">Aucun sponsor enregistré.</p>
      )}

      <div className="space-y-2 mb-3">
        {contractRows.map((c) => (
          <div key={`contract-${c.id}`} className="card p-3 flex items-start justify-between gap-3 min-h-[56px] border border-violet-400/20">
            <div className="min-w-0">
              <Link href={`/sponsors/${c.sponsor!.id}`} className="text-sm font-semibold text-violet-300 hover:underline">
                🤝 {c.sponsor!.name}
              </Link>
              <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                {CONTRACT_TYPE_LABELS[c.contractType] || c.contractType}
                {' · '}
                <span className={c.contractStatus === 'active' ? 'text-emerald-400' : ''}>
                  {CONTRACT_STATUS_LABELS[c.contractStatus] || c.contractStatus}
                </span>
              </p>
              {c.promoMessage && (
                <p className="text-[10px] text-[var(--text-dimmed)] mt-1 line-clamp-2">{c.promoMessage}</p>
              )}
            </div>
            <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0">
              {formatNumber(Number(c.amount))} {c.currency || 'MAD'}
            </span>
          </div>
        ))}
        {contractRows.length === 0 && sponsors.map((s) => (
          <div key={s.id} className="card p-3 flex items-start justify-between gap-3 min-h-[56px]">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{s.name}</p>
              <p className={`text-xs mt-0.5 ${statusColor(s.status)}`}>
                {SPONSOR_STATUS_LABELS[s.status] || s.status}
              </p>
              {(s.contactName || s.email || s.phone) && (
                <p className="text-[10px] text-[var(--text-muted)] mt-1 truncate">
                  {[s.contactName, s.email, s.phone].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0">
              {formatNumber(Number(s.amount))} MAD
            </span>
          </div>
        ))}
      </div>

      {canCreate ? (
        <GlowButton size="sm" className="w-full min-h-[48px]" onClick={() => setModalOpen(true)}>
          + Ajouter sponsor
        </GlowButton>
      ) : null}

      <SponsorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        episodes={episodes}
        fixedEpisodeId={episodeId}
      />
      <SponsorConflictModal
        open={!!conflict}
        conflict={conflict}
        onClose={() => setConflict(null)}
      />
    </>
  );

  if (mobileAccordion) {
    return (
      <Accordion
        title="Sponsors"
        subtitle={total > 0 ? `${formatNumber(total)} MAD · ${contractRows.length || sponsors.length} sponsor${(contractRows.length || sponsors.length) > 1 ? 's' : ''}` : `${contractRows.length || sponsors.length} sponsor${(contractRows.length || sponsors.length) !== 1 ? 's' : ''}`}
        defaultOpen={hasAny}
      >
        {panelBody}
      </Accordion>
    );
  }

  return (
    <GlowCard>
      <div className="flex justify-between mb-4">
        <h3 className="text-sm font-semibold">Sponsors</h3>
        {total > 0 && (
          <span className="text-sm font-semibold text-emerald-400">{formatNumber(total)} MAD</span>
        )}
      </div>
      {panelBody}
    </GlowCard>
  );
}
