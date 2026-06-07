'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlowCard } from '@/components/ui/GlowCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { InteractionsList } from '@/components/guests/InteractionsList';
import { api } from '@/lib/api';
import { useConfirm } from '@/hooks/useConfirm';
import {
  initials,
  formatDateTime,
  LANGUAGE_LABELS,
  calcReach,
  formatNumber,
  PLATFORM_LABELS,
} from '@/lib/utils';

export default function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const guestId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm, ConfirmModalComponent } = useConfirm();

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
  const revenue = (ep?.sponsors || []).reduce((s, x) => s + Number(x.amount), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ConfirmModalComponent />
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1 text-sm text-brand-yellow mb-6 hover:text-brand-blue transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>

      <GlowCard gradient className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
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
          <div className="flex items-end gap-3 flex-wrap">
            <Select
              label="Stade"
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
            <Link href={`/guests/${guestId}/edit`}>
              <GlowButton variant="ghost" size="sm">
                Modifier
              </GlowButton>
            </Link>
            <GlowButton
              variant="danger"
              size="sm"
              onClick={handleDeleteGuest}
            >
              <Trash2 className="w-3 h-3" />
            </GlowButton>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
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
                onSave={(data) => {
                  updateGuest.mutate({ shootingDate: data.shootingDate });
                  updateEpisode.mutate(data.episode);
                }}
              />
            </GlowCard>
          )}

          {isPublished && ep && (
            <GlowCard>
              <h3 className="text-sm font-semibold mb-4">Métriques podcast</h3>
              <MetricsFields
                ep={ep}
                onSave={(data) => updateEpisode.mutate(data)}
              />
            </GlowCard>
          )}
        </div>

        <div className="space-y-6">
          <InteractionsList
            guestId={guestId}
            interactions={guest.interactions || []}
          />
          {isPublished && ep && (
            <>
              <ShortsPanel episodeId={ep.id} shorts={ep.shorts || []} guestId={guestId} />
              <SponsorsPanel episodeId={ep.id} sponsors={ep.sponsors || []} guestId={guestId} />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EpisodeFields({
  guest,
  ep,
  onSave,
}: {
  guest: { shootingDate?: string | null };
  ep: { title?: string | null; episodeNumber?: number | null; recordingDate?: string | null };
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Numéro" type="number" value={num} onChange={(e) => setNum(e.target.value)} />
        <Input label="Date enreg." type="date" value={rec} onChange={(e) => setRec(e.target.value)} />
      </div>
      <div className="text-right">
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
      </div>
    </div>
  );
}

function MetricsFields({
  ep,
  onSave,
}: {
  ep: {
    listens: number;
    views: number;
    shares: number;
    completionRate?: string | number | null;
    publicationDate?: string | null;
    spotifyLink?: string | null;
    youtubeLink?: string | null;
    youtubeEpisodeUrl?: string | null;
    spotifyEpisodeUrl?: string | null;
  };
  onSave: (d: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    listens: ep.listens,
    views: ep.views,
    shares: ep.shares,
    completion: ep.completionRate?.toString() || '',
    pub: ep.publicationDate ? String(ep.publicationDate).slice(0, 10) : '',
    spotify: ep.spotifyLink || '',
    youtube: ep.youtubeLink || '',
    youtubeEpisodeUrl: ep.youtubeEpisodeUrl || '',
    spotifyEpisodeUrl: ep.spotifyEpisodeUrl || '',
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Écoutes" type="number" value={form.listens} onChange={(e) => setForm({ ...form, listens: Number(e.target.value) })} />
        <Input label="Vues YouTube" type="number" value={form.views} onChange={(e) => setForm({ ...form, views: Number(e.target.value) })} />
        <Input label="Partages" type="number" value={form.shares} onChange={(e) => setForm({ ...form, shares: Number(e.target.value) })} />
        <Input label="Complétion %" type="number" value={form.completion} onChange={(e) => setForm({ ...form, completion: e.target.value })} />
      </div>
      <Input label="Date publication" type="date" value={form.pub} onChange={(e) => setForm({ ...form, pub: e.target.value })} />
      <Input label="Spotify" value={form.spotify} onChange={(e) => setForm({ ...form, spotify: e.target.value })} />
      <Input label="YouTube" value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} />
      <Input label="YouTube Episode URL" type="url" placeholder="https://youtube.com/watch?v=..." value={form.youtubeEpisodeUrl} onChange={(e) => setForm({ ...form, youtubeEpisodeUrl: e.target.value })} />
      <Input label="Spotify Episode URL" type="url" placeholder="https://open.spotify.com/episode/..." value={form.spotifyEpisodeUrl} onChange={(e) => setForm({ ...form, spotifyEpisodeUrl: e.target.value })} />
      <div className="text-right">
        <GlowButton
          size="sm"
          onClick={() =>
            onSave({
              listens: form.listens,
              views: form.views,
              shares: form.shares,
              completionRate: form.completion ? parseFloat(form.completion) : null,
              publicationDate: form.pub || undefined,
              spotifyLink: form.spotify,
              youtubeLink: form.youtube,
              youtubeEpisodeUrl: form.youtubeEpisodeUrl || undefined,
              spotifyEpisodeUrl: form.spotifyEpisodeUrl || undefined,
            })
          }
        >
          Sauvegarder
        </GlowButton>
      </div>
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
      title: 'Delete this short/reel?',
      message: 'This action is irreversible. Do you really want to delete this short/reel?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'warning',
    });
    if (confirmed) {
      await api.shorts.delete(id);
      qc.invalidateQueries({ queryKey: ['guest', guestId] });
    }
  };

  const platformLabels: Record<string, string> = {
    youtube_shorts: 'YouTube Shorts',
    instagram_reels: 'Instagram Reels',
    tiktok: 'TikTok',
  };

  return (
    <GlowCard>
      <ConfirmModalComponent />
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold">Shorts & Reels Management</h3>
        {totalViews > 0 && <span className="text-xs text-[var(--text-muted)]">{formatNumber(totalViews)} total views</span>}
      </div>

      {shorts.length === 0 && !isAdding && (
        <p className="text-sm text-[var(--text-muted)] py-4">No shorts or reels added yet.</p>
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
            <button
              onClick={() => handleDeleteShort(s.id)}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Delete
            </button>
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
      ) : (
        <button
          className="btn-primary w-full"
          onClick={() => setIsAdding(true)}
        >
          + Add Short/Reel
        </button>
      )}
    </GlowCard>
  );
}

function SponsorsPanel({
  episodeId,
  sponsors,
  guestId,
}: {
  episodeId: number;
  sponsors: { id: number; name: string; amount: string | number; status: string }[];
  guestId: number;
}) {
  const qc = useQueryClient();
  const total = sponsors.reduce((s, x) => s + Number(x.amount), 0);

  return (
    <GlowCard>
      <div className="flex justify-between mb-4">
        <h3 className="text-sm font-semibold">Sponsors</h3>
        {total > 0 && (
          <span className="text-sm font-semibold text-emerald-400">{formatNumber(total)} MAD</span>
        )}
      </div>
      {sponsors.map((s) => (
        <p key={s.id} className="text-xs text-white/60 mb-2">
          {s.name} — {formatNumber(Number(s.amount))} MAD ({s.status})
        </p>
      ))}
      <GlowButton
        size="sm"
        className="mt-2"
        onClick={async () => {
          await api.sponsors.create({
            episodeId,
            name: 'Nouveau sponsor',
            status: 'prospect',
          });
          qc.invalidateQueries({ queryKey: ['guest', guestId] });
        }}
      >
        + Ajouter sponsor
      </GlowButton>
    </GlowCard>
  );
}
