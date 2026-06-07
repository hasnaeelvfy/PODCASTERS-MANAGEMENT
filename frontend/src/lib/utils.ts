import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-MA').format(n);
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

export function calcReach(ep?: {
  listens?: number;
  views?: number;
  shorts?: { views: number }[];
}): number {
  if (!ep) return 0;
  const shortViews = (ep.shorts || []).reduce((s, sh) => s + (sh.views || 0), 0);
  return (ep.listens || 0) + (ep.views || 0) + shortViews;
}

export const LANGUAGE_LABELS: Record<string, string> = {
  mixte: 'Darija / Français',
  francais: 'Français',
  darija: 'Darija',
  adefini: 'À définir',
};

export const PLATFORM_LABELS: Record<string, string> = {
  yt_shorts: 'YouTube Shorts',
  instagram: 'Instagram Reels',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};
