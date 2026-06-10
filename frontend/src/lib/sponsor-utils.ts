export const SPONSOR_SEPARATOR = '\n\n---\n🤝 PARTENAIRE DU MOMENT\n';

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  paused: 'En pause',
  expired: 'Expiré',
  cancelled: 'Annulé',
};

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  per_episode: 'Par épisode',
  monthly: 'Mensuel',
  campaign: 'Campagne',
  recurring: 'Récurrent',
  annual: 'Annuel',
  affiliate: 'Affiliation',
  package: 'Package',
};

/** Contract types that filter episodes by publication date within start/end. */
export const PERIOD_CONTRACT_TYPES = new Set([
  'monthly',
  'campaign',
  'recurring',
  'annual',
  'affiliate',
]);

export type EpisodePickerMode = 'published_multi' | 'period_range' | 'package_all';

export function getEpisodePickerMode(contractType: string): EpisodePickerMode {
  if (contractType === 'package') return 'package_all';
  if (contractType === 'per_episode') return 'published_multi';
  if (PERIOD_CONTRACT_TYPES.has(contractType)) return 'period_range';
  return 'published_multi';
}

export function requiresContractDates(contractType: string): boolean {
  return PERIOD_CONTRACT_TYPES.has(contractType);
}

export function isPublishedEpisode(ep: {
  guest?: { stage?: { position?: number } | null } | null;
  publicationDate?: string | null;
}): boolean {
  return ep.guest?.stage?.position === 6;
}

export function getEpisodeLabel(ep: {
  id: number;
  episodeNumber?: number | null;
  title?: string | null;
  guest?: { firstName?: string; lastName?: string } | null;
}): string {
  const num = ep.episodeNumber != null ? `#${ep.episodeNumber}` : `#${ep.id}`;
  const guestName = ep.guest
    ? `${ep.guest.firstName || ''} ${ep.guest.lastName || ''}`.trim()
    : '';
  const title = ep.title || guestName || 'Sans titre';
  return `${num} — ${title}`;
}

export function sortEpisodesByNumber<T extends { episodeNumber?: number | null; id: number }>(
  episodes: T[],
): T[] {
  return [...episodes].sort((a, b) => (a.episodeNumber || 999) - (b.episodeNumber || 999));
}

export function getPublishedEpisodes<
  T extends {
    episodeNumber?: number | null;
    id: number;
    guest?: { stage?: { position?: number } | null } | null;
    publicationDate?: string | null;
  },
>(episodes: T[]): T[] {
  return sortEpisodesByNumber(episodes.filter((ep) => isPublishedEpisode(ep)));
}

export function getEpisodesInPublicationPeriod<T extends {
  publicationDate?: string | null;
  guest?: { stage?: { position?: number } | null } | null;
  episodeNumber?: number | null;
  id: number;
}>(episodes: T[], startDate: string, endDate: string): T[] {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  if (end < start) return [];

  return getPublishedEpisodes(episodes).filter((ep) => {
    if (!ep.publicationDate) return false;
    const pub = new Date(ep.publicationDate);
    return pub >= start && pub <= end;
  });
}

export function getEpisodesForContractType<T extends Parameters<typeof getEpisodesInPublicationPeriod>[0][0]>(
  episodes: T[],
  contractType: string,
  startDate: string,
  endDate: string,
): T[] {
  if (contractType === 'package') return getPublishedEpisodes(episodes);
  if (contractType === 'per_episode') return getPublishedEpisodes(episodes);
  if (PERIOD_CONTRACT_TYPES.has(contractType)) {
    return getEpisodesInPublicationPeriod(episodes, startDate, endDate);
  }
  return getPublishedEpisodes(episodes);
}

export function pruneEpisodeSelection(
  selectedIds: number[],
  availableEpisodes: { id: number }[],
): number[] {
  const allowed = new Set(availableEpisodes.map((e) => e.id));
  return selectedIds.filter((id) => allowed.has(id));
}

export function getContractsFromEpisode(ep?: {
  contractEpisodes?: Array<{
    contract?: {
      id: number;
      contractStatus: string;
      contractType: string;
      amount?: string | number;
      currency?: string;
      sponsor?: { id: number; name: string };
    };
  }>;
}) {
  const links = ep?.contractEpisodes ?? [];
  return links
    .map((l) => l.contract)
    .filter((c): c is NonNullable<typeof c> => Boolean(c?.sponsor))
    .map((c) => ({
      contractId: c.id,
      sponsorId: c.sponsor!.id,
      name: c.sponsor!.name,
      contractStatus: c.contractStatus,
      contractType: c.contractType,
      amount: c.amount,
      currency: c.currency ?? 'MAD',
    }));
}

export function getActiveContractFromEpisode(ep?: {
  contractEpisodes?: Array<{
    contract?: {
      contractStatus: string;
      startDate?: string | null;
      sponsor?: { id: number; name: string };
    };
  }>;
}): { id: number; name: string } | null {
  const links = ep?.contractEpisodes ?? [];
  const active = links
    .map((l) => l.contract)
    .filter((c) => c?.contractStatus === 'active');
  const sponsor = active[0]?.sponsor;
  return sponsor ? { id: sponsor.id, name: sponsor.name } : null;
}
