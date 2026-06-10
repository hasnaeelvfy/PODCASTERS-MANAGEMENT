import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-MA').format(n);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m`;
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  return (
    date.toLocaleDateString('fr-MA', { weekday: 'short', day: '2-digit', month: 'short' }) +
    ' ' +
    String(date.getHours()).padStart(2, '0') +
    'h' +
    String(date.getMinutes()).padStart(2, '0')
  );
}

export function initials(first: string, last: string): string {
  return ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
}

const AVATAR_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#EF4444'];

export function userInitials(fullname: string): string {
  const parts = fullname.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || '?').toUpperCase();
}

export function avatarColorFromName(name: string): string {
  const char = (name.trim()[0] || 'A').toUpperCase();
  const index = Math.abs(char.charCodeAt(0) - 65) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] ?? AVATAR_COLORS[0];
}

export function calcReach(ep?: {
  listens?: number;
  views?: number;
  youtubeViews?: number;
  shorts?: { views: number }[];
}): number {
  if (!ep) return 0;
  const shortViews = (ep.shorts || []).reduce((s, sh) => s + (sh.views || 0), 0);
  const youtube = ep.youtubeViews && ep.youtubeViews > 0 ? ep.youtubeViews : (ep.views || 0);
  return (ep.listens || 0) + youtube + shortViews;
}

export const LANGUAGE_LABELS: Record<string, string> = {
  mixte: 'Darija / Français',
  francais: 'Français',
  darija: 'Darija',
  adefini: 'À définir',
};

export const PLATFORM_LABELS: Record<string, string> = {
  youtube_shorts: 'YouTube Shorts',
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

export const SPONSOR_STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  contacte: 'Contacté',
  nego: 'En négociation',
  confirme: 'Confirmé',
  paye: 'Payé',
  refuse: 'Refusé',
  partenaire_recurrent: 'Partenaire récurrent',
};

export function formatYoutubeViewsLabel(ep: {
  youtubeViews?: number | null;
  youtubeEpisodeUrl?: string | null;
  youtubeLink?: string | null;
}): string | null {
  const hasYoutubeUrl = Boolean(ep.youtubeEpisodeUrl?.trim() || ep.youtubeLink?.trim());
  if (!hasYoutubeUrl) return null;
  if (!ep.youtubeViews) return '— vues';
  return `${formatNumber(ep.youtubeViews)} vues`;
}

export function timeAgoFr(date: string | Date): string {
  const then = new Date(date).getTime();
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return "à l'instant";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD}j`;
  return formatDate(date);
}

export function formatEditorialDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}

export function youtubeThumbnailUrl(url?: string | null): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
    /youtube\.com\/shorts\/([^?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  return null;
}
