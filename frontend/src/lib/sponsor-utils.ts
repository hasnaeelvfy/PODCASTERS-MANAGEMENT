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

/** Types that auto-select all episodes in the computed period. */
export const AUTO_SELECT_CONTRACT_TYPES = new Set(['monthly', 'campaign', 'annual']);

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

export function requiresStartDate(contractType: string): boolean {
  return Boolean(contractType);
}

export function requiresEndDate(contractType: string): boolean {
  if (!contractType) return false;
  return !['recurring', 'affiliate'].includes(contractType);
}

export function isEndDateOptional(contractType: string): boolean {
  return contractType === 'recurring' || contractType === 'affiliate';
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthEndDate(startDate: string): string {
  const start = new Date(startDate);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return formatDateLocal(end);
}

export function getAnnualEndDate(startDate: string): string {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 365);
  return formatDateLocal(end);
}

export function getAutoEndDate(contractType: string, startDate: string): string | null {
  if (!startDate) return null;
  if (contractType === 'monthly') return getMonthEndDate(startDate);
  if (contractType === 'annual') return getAnnualEndDate(startDate);
  return null;
}

export function getEndDatePlaceholder(contractType: string): string | undefined {
  if (isEndDateOptional(contractType)) return 'Optionnelle — sans limite';
  return undefined;
}

export function applyStartDateWithAutoEnd(
  contractType: string,
  startDate: string,
  currentEndDate: string,
): { startDate: string; endDate: string } {
  const autoEnd = getAutoEndDate(contractType, startDate);
  return {
    startDate,
    endDate: autoEnd ?? currentEndDate,
  };
}

export function getMinEpisodesRequired(contractType: string): number {
  if (contractType === 'package') return 2;
  return 1;
}

export function getEffectiveDateRange(
  contractType: string,
  startDate: string,
  endDate: string,
): { startDate: string; endDate: string } | null {
  if (!startDate) return null;

  if (contractType === 'monthly') {
    return { startDate, endDate: endDate || getMonthEndDate(startDate) };
  }

  if (contractType === 'annual') {
    return { startDate, endDate: endDate || getAnnualEndDate(startDate) };
  }

  if (contractType === 'recurring' || contractType === 'affiliate') {
    if (endDate && new Date(endDate) < new Date(startDate)) return null;
    return { startDate, endDate: endDate || '' };
  }

  if (!PERIOD_CONTRACT_TYPES.has(contractType)) return null;

  if (!endDate) return null;
  if (new Date(endDate) < new Date(startDate)) return null;
  return { startDate, endDate };
}

export function getEpisodeCounterLabel(
  contractType: string,
  selectedCount: number,
): { text: string; ok: boolean } {
  if (contractType === 'package') {
    const ok = selectedCount >= 2;
    return { text: ok ? `${selectedCount}/2 ✓` : `${selectedCount}/2`, ok };
  }
  const min = getMinEpisodesRequired(contractType);
  const ok = selectedCount >= min;
  return { text: ok ? `${selectedCount}/${min} ✓` : `${selectedCount}/${min}`, ok };
}

export function getEpisodeSelectionError(
  contractType: string,
  selectedCount: number,
  availableCount: number,
  options?: { startDate?: string; endDate?: string },
): string | null {
  if (!contractType) return null;

  const startDate = options?.startDate ?? '';
  const endDate = options?.endDate ?? '';

  if (!startDate) return null;
  if (getInvalidDateMessage(startDate)) return null;
  if (requiresEndDate(contractType) && !endDate) return null;
  if (endDate && getInvalidDateMessage(endDate)) return null;
  if (startDate && endDate && new Date(endDate) < new Date(startDate)) return null;

  if (availableCount === 0) {
    return 'Tous les épisodes sont déjà sponsorisés sur cette période. Changez les dates.';
  }

  if (AUTO_SELECT_CONTRACT_TYPES.has(contractType)) {
    return null;
  }

  if (contractType === 'package' && selectedCount < 2) {
    return `Sélectionnez au moins 2 épisodes pour un package (${selectedCount}/2)`;
  }

  if (selectedCount < 1) {
    if (contractType === 'per_episode') return 'Sélectionnez au moins 1 épisode';
    return 'Sélectionnez au moins 1 épisode';
  }

  return null;
}

export function isEpisodeSelectionValid(
  contractType: string,
  selectedCount: number,
  availableCount: number,
  options?: { startDate?: string; endDate?: string },
): boolean {
  return getEpisodeSelectionError(contractType, selectedCount, availableCount, options) === null;
}

export interface SponsorEpisodeFormSlice {
  contractType: string;
  episodeIds: number[];
  startDate: string;
  endDate: string;
}

export function getInvalidDateMessage(dateStr: string): string | null {
  if (!dateStr) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'Date invalide';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12) return 'Date invalide';
  const maxDay = new Date(y, m, 0).getDate();
  const parsed = new Date(y, m - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
    return `Date invalide — ce mois n'a que ${maxDay} jours`;
  }
  return null;
}

export function parseValidDateString(dateStr: string): Date | null {
  return getInvalidDateMessage(dateStr) ? null : new Date(dateStr);
}

export function resolveContractEndDateForCheck(
  contractType: string,
  startDate: string,
  endDate: string,
): string | null {
  const range = getEffectiveDateRange(contractType, startDate, endDate);
  if (!range) return endDate || null;
  return range.endDate || null;
}

export function formatConflictBadge(conflict: {
  sponsorName: string;
  endDate: string | null;
}): string {
  if (conflict.endDate) {
    const end = new Date(conflict.endDate).toLocaleDateString('fr-FR');
    return `Déjà sponsorisé — ${conflict.sponsorName} jusqu'au ${end}`;
  }
  return `Déjà sponsorisé — ${conflict.sponsorName} (sans date de fin)`;
}

export function getContractDateErrors(form: SponsorEpisodeFormSlice): Record<string, string> {
  const errors: Record<string, string> = {};
  const { contractType, startDate, endDate } = form;

  if (!contractType) {
    return errors;
  }

  if (!startDate) {
    errors.startDate = 'La date de début est obligatoire';
  } else {
    const startInvalid = getInvalidDateMessage(startDate);
    if (startInvalid) errors.startDate = startInvalid;
  }

  if (requiresEndDate(contractType) && !endDate) {
    errors.endDate =
      contractType === 'campaign'
        ? 'La date de fin est obligatoire pour une campagne'
        : 'La date de fin est obligatoire';
  } else if (endDate) {
    const endInvalid = getInvalidDateMessage(endDate);
    if (endInvalid) errors.endDate = endInvalid;
  }

  if (
    startDate &&
    endDate &&
    !errors.startDate &&
    !errors.endDate &&
    parseValidDateString(startDate) &&
    parseValidDateString(endDate) &&
    new Date(endDate) < new Date(startDate)
  ) {
    errors.endDate = 'La date de fin doit être après la date de début';
  }

  return errors;
}

export function getYoutubeFieldsErrors(
  autoUpdateYoutube: boolean,
  trackingUrl: string,
  promoMessage: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!autoUpdateYoutube) return errors;

  if (!promoMessage.trim()) {
    errors.promoMessage = 'Le message promo est obligatoire pour la mise à jour YouTube';
  }

  const url = trackingUrl.trim();
  if (!url) {
    errors.trackingUrl = 'Le lien de tracking est obligatoire pour la mise à jour YouTube';
  } else if (!url.startsWith('https://')) {
    errors.trackingUrl = 'Entrez une URL valide (https://...)';
  }

  return errors;
}

export function validateEpisodeFormFields(
  form: SponsorEpisodeFormSlice,
  availableEpisodeCount: number,
): { errors: Record<string, string>; episodesValid: boolean } {
  const errors: Record<string, string> = {};

  if (!form.contractType) {
    errors.contractType = 'Veuillez choisir un type de sponsoring';
  }

  const episodeError = getEpisodeSelectionError(
    form.contractType,
    form.episodeIds.length,
    availableEpisodeCount,
    { startDate: form.startDate, endDate: form.endDate },
  );
  if (episodeError) {
    errors.episodeIds = episodeError;
  }

  const datesValid = Object.keys(getContractDateErrors(form)).length === 0;
  const episodesValid = !errors.episodeIds && !errors.contractType && datesValid;

  return { errors, episodesValid };
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
}>(episodes: T[], startDate: string, endDate?: string): T[] {
  if (!startDate) return [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (!endDate) {
    return getPublishedEpisodes(episodes).filter((ep) => {
      if (!ep.publicationDate) return false;
      return new Date(ep.publicationDate) >= start;
    });
  }

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  if (end < start) return [];

  return getPublishedEpisodes(episodes).filter((ep) => {
    if (!ep.publicationDate) return false;
    const pub = new Date(ep.publicationDate);
    return pub >= start && pub <= end;
  });
}

/** Tous les épisodes publiés — la période du contrat ne filtre pas par date de publication. */
export function getEpisodesForContractType<T extends Parameters<typeof getPublishedEpisodes>[0][0]>(
  episodes: T[],
  _contractType?: string,
  _startDate?: string,
  _endDate?: string,
): T[] {
  return getPublishedEpisodes(episodes);
}

export function getSelectableEpisodes<T extends { id: number }>(
  episodes: T[],
  conflictEpisodeIds: Set<number> | number[],
): T[] {
  const blocked = conflictEpisodeIds instanceof Set
    ? conflictEpisodeIds
    : new Set(conflictEpisodeIds);
  return episodes.filter((ep) => !blocked.has(ep.id));
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
