import { Prisma, YoutubeLogTrigger, YoutubeQueueAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { getValidAccessToken } from './platform-token.service';
import { extractYoutubeVideoId } from './youtube-data.service';
import { broadcastNotification } from './notification.service';
import type { ContractWithRelations } from './contract.service';

/**
 * Outcome of a YouTube write attempt:
 * - 'applied': the change was confirmed on YouTube (verified read-back).
 * - 'queued': quota was exceeded, the work was queued for later retry. The
 *   caller MUST NOT mark this as success.
 */
export type YoutubeApplyResult = 'applied' | 'queued';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
export const SPONSOR_SEPARATOR = '\n\n---\n🤝 PARTENAIRE DU MOMENT\n';

const DEFAULT_TEMPLATE =
  '🎯 Sponsorisé par {sponsor_name} — {promo_message}\n👉 {tracking_url}\nCode : {discount_code}';

export function resolveVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  return extractYoutubeVideoId(urlOrId);
}

async function getWriteAccessToken(): Promise<string> {
  const token = await getValidAccessToken('youtube');
  if (!token) {
    throw new AppError(
      400,
      'Reconnexion YouTube requise — connectez votre compte dans Intégrations',
    );
  }

  const row = await prisma.platformToken.findUnique({ where: { platform: 'youtube' } });
  const scope = row?.scope ?? '';
  console.log('[YT-DEBUG] stored YouTube scope:', JSON.stringify(scope) || '(empty)');
  if (!scope.includes('youtube.force-ssl') && !scope.includes('youtube')) {
    throw new AppError(
      400,
      'Reconnexion YouTube requise — le scope youtube.force-ssl est manquant',
    );
  }

  return token;
}

function isQuotaError(message: string): boolean {
  return /quota|rateLimit|dailyLimit/i.test(message);
}

/**
 * YouTube stores descriptions after normalizing line endings (CRLF→LF),
 * trimming leading/trailing whitespace and stripping angle brackets (`<`/`>`).
 * Normalize both sides before comparing so verification doesn't flag a
 * successful update as a mismatch.
 */
function normalizeForCompare(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[<>]/g, '').trim();
}

/** Small stable hash for idempotency checks (FNV-1a, hex). */
function simpleHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/** Minimal shape needed to render one sponsor block. ContractWithRelations satisfies it. */
type SponsorBlockInput = {
  youtubeDescriptionTemplate: string | null;
  promoMessage: string | null;
  trackingUrl: string | null;
  discountCode: string | null;
  sponsor: { name: string };
};

export function buildSponsorBlock(contract: SponsorBlockInput): string {
  const template = contract.youtubeDescriptionTemplate || DEFAULT_TEMPLATE;
  const sponsorName = contract.sponsor.name;
  const promo = contract.promoMessage || '';
  const url = contract.trackingUrl || '';
  const code = contract.discountCode || '';

  return template
    .replace(/\{sponsor_name\}/g, sponsorName)
    .replace(/\{promo_message\}/g, promo)
    .replace(/\{tracking_url\}/g, url)
    .replace(/\{discount_code\}/g, code)
    .replace(/Code : \s*$/m, code ? `Code : ${code}` : '')
    .trim();
}

const SPONSOR_SINGLE_HEADER = '🤝 PARTENAIRE DU MOMENT';
const SPONSOR_MULTI_HEADER = '🤝 PARTENAIRES DU MOMENT';

/**
 * Build the full sponsor section appended to a description. With one sponsor it
 * uses the singular header; with several it uses a single combined section with
 * the plural header and one block per sponsor.
 */
export function buildSponsorSection(contracts: SponsorBlockInput[]): string {
  const blocks = contracts
    .map((c) => buildSponsorBlock(c).trim())
    .filter((b) => b.length > 0);
  const header = blocks.length > 1 ? SPONSOR_MULTI_HEADER : SPONSOR_SINGLE_HEADER;
  return `---\n${header}\n${blocks.join('\n\n')}`;
}

function ytStartOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type ActiveContractRow = SponsorBlockInput & {
  id: number;
  contractStatus: string;
  startDate: Date | null;
  endDate: Date | null;
  deletedAt: Date | null;
};

function isContractActiveOnDate(c: ActiveContractRow, date: Date): boolean {
  if (c.contractStatus !== 'active' || c.deletedAt) return false;
  const day = ytStartOfDay(date);
  if (c.startDate && ytStartOfDay(c.startDate) > day) return false;
  if (c.endDate && ytStartOfDay(c.endDate) < day) return false;
  return true;
}

/**
 * All currently-active, non-deleted contracts linked to an episode, so the
 * description can list every sponsor. The contract being applied is always
 * included (it may have just been activated in the same request).
 */
async function getActiveSponsorContracts(
  episodeId: number,
  current: ContractWithRelations,
): Promise<SponsorBlockInput[]> {
  const links = await prisma.contractEpisode.findMany({
    where: { episodeId },
    include: {
      contract: {
        include: { sponsor: { select: { name: true } } },
      },
    },
  });

  const now = new Date();
  const byId = new Map<number, ActiveContractRow>();
  for (const link of links) {
    const c = link.contract as unknown as ActiveContractRow;
    if (isContractActiveOnDate(c, now)) byId.set(c.id, c);
  }
  // Ensure the contract being applied is included even if not yet visible as active.
  if (!byId.has(current.id)) {
    byId.set(current.id, current as unknown as ActiveContractRow);
  }

  return [...byId.values()].sort((a, b) => {
    const aStart = a.startDate?.getTime() ?? 0;
    const bStart = b.startDate?.getTime() ?? 0;
    if (aStart !== bStart) return aStart - bStart;
    return a.id - b.id;
  });
}

// Matches both "🤝 PARTENAIRE DU MOMENT" and "🤝 PARTENAIRES DU MOMENT".
const SPONSOR_MARKER = '🤝 PARTENAIRE';

export function stripSponsorBlock(description: string): string {
  // Anchor on the unique sponsor marker only, so a legitimate "---" in the
  // creator's real description is never mistaken for the sponsor block.
  const markerIdx = description.indexOf(SPONSOR_MARKER);
  if (markerIdx === -1) return description;

  // Cut from the "---" separator only when it sits immediately before the marker
  // (just whitespace between), otherwise cut from the marker itself. This avoids
  // over-cutting a legitimate "---" that appears earlier in the real description.
  const before = description.slice(0, markerIdx);
  const sepIdx = before.lastIndexOf('---');
  const betweenIsWhitespace = sepIdx !== -1 && before.slice(sepIdx + 3).trim() === '';
  const cutAt = betweenIsWhitespace ? sepIdx : markerIdx;
  return description.slice(0, cutAt).trimEnd();
}

interface VideoSnippet {
  title: string;
  description: string;
  categoryId: string;
  channelId: string;
}

async function fetchVideoSnippet(videoId: string, accessToken: string): Promise<VideoSnippet> {
  const res = await fetch(
    `${YOUTUBE_API}/videos?part=snippet&id=${videoId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const body = (await res.json()) as {
    items?: {
      snippet?: { title?: string; description?: string; categoryId?: string; channelId?: string };
    }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new AppError(res.status, body.error?.message || 'Impossible de lire la vidéo YouTube');
  }
  const snippet = body.items?.[0]?.snippet;
  if (!snippet) throw new AppError(404, 'Vidéo YouTube introuvable');
  return {
    title: snippet.title || '',
    description: snippet.description || '',
    categoryId: snippet.categoryId || '22',
    channelId: snippet.channelId || '',
  };
}

async function getAuthenticatedChannelId(accessToken: string): Promise<string | null> {
  const res = await fetch(`${YOUTUBE_API}/channels?part=id&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await res.json()) as {
    items?: { id?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    console.warn('[YT-DEBUG] channels?mine=true failed:', res.status, JSON.stringify(body.error));
    return null;
  }
  return body.items?.[0]?.id ?? null;
}

// Cache the authenticated channel ID so we don't spend a quota unit fetching it
// on every single episode update (it changes only when the connected account does).
let cachedChannelId: { id: string | null; at: number } | null = null;
const CHANNEL_ID_TTL_MS = 10 * 60 * 1000;

async function getCachedChannelId(accessToken: string): Promise<string | null> {
  if (cachedChannelId && Date.now() - cachedChannelId.at < CHANNEL_ID_TTL_MS) {
    return cachedChannelId.id;
  }
  const id = await getAuthenticatedChannelId(accessToken);
  // Only cache positive results; a transient failure shouldn't disable ownership checks.
  if (id) cachedChannelId = { id, at: Date.now() };
  return id;
}

async function patchVideoDescription(
  videoId: string,
  snippet: VideoSnippet,
  newDescription: string,
  accessToken: string,
): Promise<Record<string, unknown>> {
  const requestBody = {
    id: videoId,
    snippet: {
      title: snippet.title,
      description: newDescription,
      categoryId: snippet.categoryId,
    },
  };

  console.log('[YT-DEBUG] videos.update request → videoId:', videoId);
  console.log('[YT-DEBUG] videos.update request body:', JSON.stringify(requestBody));

  const res = await fetch(`${YOUTUBE_API}/videos?part=snippet`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  const body = (await res.json()) as Record<string, unknown> & {
    error?: { message?: string };
  };

  console.log('[YT-DEBUG] videos.update response status:', res.status, res.statusText);
  console.log('[YT-DEBUG] videos.update response body:', JSON.stringify(body));

  if (!res.ok) {
    const msg = body.error?.message || `YouTube update failed (${res.status})`;
    if (isQuotaError(msg)) {
      throw new AppError(429, `quotaExceeded: ${msg}`);
    }
    throw new AppError(res.status, msg);
  }
  return body;
}

export async function queueUpdate(
  youtubeVideoId: string,
  contractId: number | null,
  action: YoutubeQueueAction,
  payload: Record<string, unknown>,
): Promise<void> {
  await prisma.youtubeSyncQueue.create({
    data: {
      youtubeVideoId,
      contractId,
      action,
      payload: payload as Prisma.InputJsonValue,
      status: 'pending',
    },
  });
}

async function logYoutubeAction(params: {
  contractId?: number | null;
  youtubeVideoId: string;
  action: 'description_updated' | 'comment_pinned' | 'comment_deleted' | 'rollback' | 'description_restored';
  oldDescription?: string | null;
  newDescription?: string | null;
  oldComment?: string | null;
  newComment?: string | null;
  triggeredBy: YoutubeLogTrigger;
  success: boolean;
  errorMessage?: string | null;
}) {
  await prisma.sponsorYoutubeLog.create({ data: params });
}

export async function updateVideoDescription(
  youtubeVideoId: string,
  contract: ContractWithRelations,
  episodeId: number,
  triggeredBy: YoutubeLogTrigger,
): Promise<YoutubeApplyResult> {
  console.log('[YT-DEBUG] ===== updateVideoDescription START =====');
  console.log('[YT-DEBUG] videoId:', youtubeVideoId, '| episodeId:', episodeId, '| contractId:', contract.id);

  let currentDescription = '';
  let newDescription = '';

  try {
    const accessToken = await getWriteAccessToken();
    const snippet = await fetchVideoSnippet(youtubeVideoId, accessToken);
    currentDescription = snippet.description;
    console.log('[YT-DEBUG] description BEFORE update (from YouTube):', JSON.stringify(currentDescription));

    const myChannelId = await getCachedChannelId(accessToken);
    console.log('[YT-DEBUG] authenticated channelId:', myChannelId || '(unknown)');
    console.log('[YT-DEBUG] video channelId:', snippet.channelId || '(unknown)');
    const ownsVideo = !!myChannelId && !!snippet.channelId && myChannelId === snippet.channelId;
    console.log('[YT-DEBUG] ownership check:', ownsVideo ? 'OWNED ✅ video belongs to connected channel' : 'NOT OWNED ❌ connected channel does not own this video');
    if (myChannelId && snippet.channelId && !ownsVideo) {
      throw new AppError(
        403,
        `La vidéo ${youtubeVideoId} appartient à la chaîne ${snippet.channelId}, mais le compte connecté est ${myChannelId}. Seul le propriétaire peut modifier la description.`,
      );
    }

    const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) throw new AppError(404, 'Épisode introuvable');

    const baseDescription = episode.youtubeDescriptionOriginal
      ? episode.youtubeDescriptionOriginal
      : stripSponsorBlock(currentDescription);
    console.log(
      '[YT-DEBUG] baseDescription source:',
      episode.youtubeDescriptionOriginal ? 'episode.youtubeDescriptionOriginal' : 'stripSponsorBlock(current)',
    );
    console.log('[YT-DEBUG] baseDescription:', JSON.stringify(baseDescription));

    if (!episode.youtubeDescriptionOriginal) {
      await prisma.episode.update({
        where: { id: episodeId },
        data: { youtubeDescriptionOriginal: baseDescription },
      });
    }

    const activeContracts = await getActiveSponsorContracts(episodeId, contract);
    const sponsorSection = buildSponsorSection(activeContracts);
    const sectionPrefix = baseDescription ? '\n\n' : '';
    newDescription = `${baseDescription}${sectionPrefix}${sponsorSection}`;
    console.log('[YT-DEBUG] active sponsors on episode:', activeContracts.map((c) => c.sponsor.name).join(', ') || '(none)');
    console.log('[YT-DEBUG] sponsorSection:', JSON.stringify(sponsorSection));
    console.log('[YT-DEBUG] description SENT to YouTube:', JSON.stringify(newDescription));

    // Verify against the authoritative resource returned by the PUT itself.
    // This avoids a quota-costing second read and the eventual-consistency
    // false-negatives that a fresh videos.list read-back can produce.
    const updatedBody = await patchVideoDescription(youtubeVideoId, snippet, newDescription, accessToken);
    const appliedDescription =
      (updatedBody.snippet as { description?: string } | undefined)?.description ?? '';
    let verified = normalizeForCompare(appliedDescription) === normalizeForCompare(newDescription);
    let readDescription = appliedDescription;

    // Fallback: if the PUT response didn't echo the snippet, confirm with one read.
    if (!verified) {
      const verifySnippet = await fetchVideoSnippet(youtubeVideoId, accessToken);
      readDescription = verifySnippet.description;
      verified = normalizeForCompare(verifySnippet.description) === normalizeForCompare(newDescription);
    }
    console.log('[YT-DEBUG] description AFTER update (verified source):', JSON.stringify(readDescription));
    console.log('[YT-DEBUG] VERIFICATION:', verified ? 'MATCH ✅ YouTube persisted the change' : 'MISMATCH ❌ YouTube did NOT persist the change');

    if (!verified) {
      const verificationDetails =
        `Vérification post-update échouée — YouTube n'a pas appliqué la description. ` +
        `Attendu (${newDescription.length} car.) / Lu (${readDescription.length} car.). ` +
        `Lu: ${JSON.stringify(readDescription.slice(0, 500))}`;
      console.warn('[YT-DEBUG]', verificationDetails);
      console.log('[YT-DEBUG] ===== updateVideoDescription END (FAILED — verification mismatch) =====');
      throw new AppError(502, verificationDetails);
    }

    await logYoutubeAction({
      contractId: contract.id,
      youtubeVideoId,
      action: 'description_updated',
      oldDescription: currentDescription,
      newDescription,
      triggeredBy,
      success: true,
    });
    console.log('[YT-DEBUG] ===== updateVideoDescription END (success log written, verified ✅) =====');
    return 'applied';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    const isQuota = err instanceof AppError && err.statusCode === 429;
    await logYoutubeAction({
      contractId: contract.id,
      youtubeVideoId,
      action: 'description_updated',
      oldDescription: currentDescription,
      newDescription,
      triggeredBy,
      success: false,
      errorMessage: isQuota ? `En file d'attente (quota dépassé) : ${message}` : message,
    });
    if (isQuota) {
      await queueUpdate(youtubeVideoId, contract.id, 'update_description', {
        episodeId,
        contractId: contract.id,
      });
      return 'queued';
    }
    throw err;
  }
}

export async function deletePinnedComment(
  commentId: string,
  accessToken: string,
  youtubeVideoId: string,
  contractId: number | null,
  triggeredBy: YoutubeLogTrigger,
): Promise<void> {
  const res = await fetch(`${YOUTUBE_API}/comments?id=${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new AppError(res.status, body.error?.message || 'Suppression commentaire échouée');
  }
  await logYoutubeAction({
    contractId,
    youtubeVideoId,
    action: 'comment_deleted',
    triggeredBy,
    success: true,
  });
}

const COMMENT_HASH_KEY = (episodeId: number) => `yt_comment_hash:${episodeId}`;

/**
 * Posts a top-level sponsor comment on the video.
 *
 * NOTE: The YouTube Data API v3 cannot programmatically *pin* a comment — there
 * is no pin endpoint. This posts (and refreshes) a sponsor comment; pinning must
 * be done manually in YouTube Studio. The function name is kept for
 * compatibility. It is idempotent: if the computed comment text is unchanged
 * since the last post for this episode, it is skipped to save quota and avoid
 * spamming duplicate comments.
 */
export async function pinSponsorComment(
  youtubeVideoId: string,
  contract: ContractWithRelations,
  episodeId: number,
  triggeredBy: YoutubeLogTrigger,
): Promise<YoutubeApplyResult> {
  const accessToken = await getWriteAccessToken();
  const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
  if (!episode) throw new AppError(404, 'Épisode introuvable');

  const activeContracts = await getActiveSponsorContracts(episodeId, contract);
  const commentText =
    activeContracts.length > 1
      ? `📢 Partenaires du moment :\n${activeContracts
          .map((c) => `- ${c.sponsor.name}${c.trackingUrl ? ` — ${c.trackingUrl}` : ''}`)
          .join('\n')}`
      : `📢 Partenaire : ${contract.sponsor.name}${contract.trackingUrl ? ` — ${contract.trackingUrl}` : ''}`;

  // Idempotency: skip the delete+repost cycle when the comment is unchanged.
  const commentHash = simpleHash(commentText);
  const settingKey = COMMENT_HASH_KEY(episodeId);
  const prevHash = await prisma.appSetting.findUnique({ where: { settingKey } });
  if (episode.youtubePinnedCommentId && prevHash?.settingValue === commentHash) {
    console.log('[YT-DEBUG] pinSponsorComment skipped — identical comment already posted');
    return 'applied';
  }

  if (episode.youtubePinnedCommentId) {
    try {
      await deletePinnedComment(
        episode.youtubePinnedCommentId,
        accessToken,
        youtubeVideoId,
        contract.id,
        triggeredBy,
      );
    } catch {
      /* continue */
    }
  }

  const res = await fetch(`${YOUTUBE_API}/commentThreads?part=snippet`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        videoId: youtubeVideoId,
        topLevelComment: {
          snippet: { textOriginal: commentText },
        },
      },
    }),
  });

  const body = (await res.json()) as {
    id?: string;
    snippet?: { topLevelComment?: { id?: string } };
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = body.error?.message || 'Création commentaire échouée';
    await logYoutubeAction({
      contractId: contract.id,
      youtubeVideoId,
      action: 'comment_pinned',
      newComment: commentText,
      triggeredBy,
      success: false,
      errorMessage: isQuotaError(msg) ? `En file d'attente (quota dépassé) : ${msg}` : msg,
    });
    if (isQuotaError(msg)) {
      await queueUpdate(youtubeVideoId, contract.id, 'pin_comment', {
        episodeId,
        contractId: contract.id,
      });
      return 'queued';
    }
    throw new AppError(res.status, msg);
  }

  const commentId = body.snippet?.topLevelComment?.id || body.id;
  if (commentId) {
    await prisma.episode.update({
      where: { id: episodeId },
      data: { youtubePinnedCommentId: commentId },
    });
  }

  // Remember the posted comment so an unchanged re-apply is a no-op next time.
  await prisma.appSetting.upsert({
    where: { settingKey },
    create: { settingKey, settingValue: commentHash },
    update: { settingValue: commentHash },
  });

  await logYoutubeAction({
    contractId: contract.id,
    youtubeVideoId,
    action: 'comment_pinned',
    newComment: commentText,
    triggeredBy,
    success: true,
  });
  return 'applied';
}

export async function restoreOriginalDescription(
  youtubeVideoId: string,
  episodeId: number,
  contractId: number | null,
  triggeredBy: YoutubeLogTrigger,
): Promise<void> {
  const accessToken = await getWriteAccessToken();
  const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
  if (!episode) throw new AppError(404, 'Épisode introuvable');

  const snippet = await fetchVideoSnippet(youtubeVideoId, accessToken);

  // Ownership check (mirrors updateVideoDescription) so we never attempt — and
  // never falsely log success on — a video the connected account doesn't own.
  const myChannelId = await getCachedChannelId(accessToken);
  if (myChannelId && snippet.channelId && myChannelId !== snippet.channelId) {
    const ownershipError = new AppError(
      403,
      `La vidéo ${youtubeVideoId} appartient à la chaîne ${snippet.channelId}, mais le compte connecté est ${myChannelId}. Seul le propriétaire peut modifier la description.`,
    );
    await logYoutubeAction({
      contractId,
      youtubeVideoId,
      action: 'rollback',
      triggeredBy,
      success: false,
      errorMessage: ownershipError.message,
    });
    throw ownershipError;
  }

  // Always strip any sponsor block so the restored description never carries a
  // (possibly stale) sponsor message. It stays sponsor-free until a new sponsor
  // contract is applied, which re-appends a fresh block.
  const original = stripSponsorBlock(
    episode.youtubeDescriptionOriginal || snippet.description,
  );

  try {
    const restoredBody = await patchVideoDescription(youtubeVideoId, snippet, original, accessToken);
    const appliedDescription =
      (restoredBody.snippet as { description?: string } | undefined)?.description ?? '';
    const verified = normalizeForCompare(appliedDescription) === normalizeForCompare(original);
    if (!verified) {
      const verifySnippet = await fetchVideoSnippet(youtubeVideoId, accessToken);
      if (normalizeForCompare(verifySnippet.description) !== normalizeForCompare(original)) {
        throw new AppError(
          502,
          `Vérification post-restauration échouée — YouTube n'a pas appliqué la description restaurée.`,
        );
      }
    }

    if (episode.youtubePinnedCommentId) {
      await deletePinnedComment(
        episode.youtubePinnedCommentId,
        accessToken,
        youtubeVideoId,
        contractId,
        triggeredBy,
      );
      await prisma.episode.update({
        where: { id: episodeId },
        data: { youtubePinnedCommentId: null },
      });
    }
    // Forget the stored comment hash so a future sponsor re-posts cleanly.
    await prisma.appSetting
      .delete({ where: { settingKey: COMMENT_HASH_KEY(episodeId) } })
      .catch(() => undefined);

    await logYoutubeAction({
      contractId,
      youtubeVideoId,
      action: triggeredBy === 'manual' ? 'rollback' : 'description_restored',
      oldDescription: snippet.description,
      newDescription: original,
      triggeredBy,
      success: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur rollback';
    await logYoutubeAction({
      contractId,
      youtubeVideoId,
      action: 'rollback',
      triggeredBy,
      success: false,
      errorMessage: message,
    });
    if (err instanceof AppError && err.statusCode === 429) {
      await queueUpdate(youtubeVideoId, contractId, 'restore_description', { episodeId });
      return;
    }
    throw err;
  }
}

export async function applyContractToVideo(
  youtubeVideoId: string,
  contract: ContractWithRelations,
  episodeId: number,
  triggeredBy: YoutubeLogTrigger,
): Promise<YoutubeApplyResult> {
  const descResult = await updateVideoDescription(youtubeVideoId, contract, episodeId, triggeredBy);

  // If the description hit quota and was queued, don't burn another quota unit
  // trying to post the comment now — queue it so it's retried together later.
  if (descResult === 'queued') {
    await queueUpdate(youtubeVideoId, contract.id, 'pin_comment', {
      episodeId,
      contractId: contract.id,
    });
    return 'queued';
  }

  const pinResult = await pinSponsorComment(youtubeVideoId, contract, episodeId, triggeredBy);
  return pinResult === 'queued' ? 'queued' : 'applied';
}

const QUEUE_MAX_ATTEMPTS = 5;

/** Exponential backoff: ~2, 4, 8, 16 minutes between retries. */
function nextQueueSchedule(attempts: number): Date {
  const minutes = Math.min(2 ** attempts, 60);
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function processYoutubeQueue(limit = 100): Promise<{ processed: number; failed: number }> {
  const items = await prisma.youtubeSyncQueue.findMany({
    where: { status: 'pending', scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  });

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    // Atomically claim the item. If another worker/run grabbed it first, skip.
    const claim = await prisma.youtubeSyncQueue.updateMany({
      where: { id: item.id, status: 'pending' },
      data: { status: 'processing', attempts: { increment: 1 } },
    });
    if (claim.count === 0) continue;

    try {
      const payload = (item.payload ?? {}) as { episodeId?: number; contractId?: number };
      const episodeId = payload.episodeId;
      const contractId = payload.contractId ?? item.contractId;

      if (item.action === 'restore_description' && episodeId) {
        await restoreOriginalDescription(
          item.youtubeVideoId,
          episodeId,
          contractId,
          'cron',
        );
      } else if (contractId && episodeId) {
        const { getContractById } = await import('./contract.service');
        const contract = await getContractById(contractId);
        if (item.action === 'update_description') {
          await updateVideoDescription(item.youtubeVideoId, contract, episodeId, 'cron');
        } else if (item.action === 'pin_comment') {
          await pinSponsorComment(item.youtubeVideoId, contract, episodeId, 'cron');
        }
      }

      await prisma.youtubeSyncQueue.update({
        where: { id: item.id },
        data: { status: 'done', processedAt: new Date(), lastError: null },
      });
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur queue';
      const attempts = item.attempts + 1;
      const dead = attempts >= QUEUE_MAX_ATTEMPTS;
      await prisma.youtubeSyncQueue.update({
        where: { id: item.id },
        data: {
          status: dead ? 'failed' : 'pending',
          lastError: message.slice(0, 2000),
          ...(dead ? {} : { scheduledAt: nextQueueSchedule(attempts) }),
        },
      });
      failed++;

      // Surface permanent failures so they don't die silently.
      if (dead) {
        try {
          await broadcastNotification(
            'sponsor_relance',
            '⚠️ Sync YouTube échouée',
            `La synchronisation YouTube (${item.action}) pour la vidéo ${item.youtubeVideoId} a échoué après ${attempts} tentatives : ${message.slice(0, 200)}`,
            '/sponsors/youtube-logs',
          );
        } catch (notifyErr) {
          console.error('[YoutubeQueue] dead-letter notification failed:', notifyErr);
        }
      }
    }
  }

  return { processed, failed };
}

export async function rollbackVideoDescription(youtubeVideoId: string): Promise<void> {
  const link = await prisma.contractEpisode.findFirst({
    where: { youtubeVideoId },
    orderBy: { updatedAt: 'desc' },
  });
  if (!link) throw new AppError(404, 'Aucun épisode lié à cette vidéo');
  await restoreOriginalDescription(youtubeVideoId, link.episodeId, null, 'manual');
}
