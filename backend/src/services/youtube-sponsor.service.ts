import { Prisma, YoutubeLogTrigger, YoutubeQueueAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { getValidAccessToken } from './platform-token.service';
import { extractYoutubeVideoId } from './youtube-data.service';
import type { ContractWithRelations } from './contract.service';

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

export function buildSponsorBlock(contract: ContractWithRelations): string {
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

export function stripSponsorBlock(description: string): string {
  const idx = description.indexOf(SPONSOR_SEPARATOR.trim().split('\n')[0]);
  if (idx === -1) {
    const alt = description.indexOf('🤝 PARTENAIRE DU MOMENT');
    if (alt === -1) return description;
    return description.slice(0, alt).trimEnd();
  }
  return description.slice(0, idx).trimEnd();
}

interface VideoSnippet {
  title: string;
  description: string;
  categoryId: string;
}

async function fetchVideoSnippet(videoId: string, accessToken: string): Promise<VideoSnippet> {
  const res = await fetch(
    `${YOUTUBE_API}/videos?part=snippet&id=${videoId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const body = (await res.json()) as {
    items?: { snippet?: { title?: string; description?: string; categoryId?: string } }[];
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
  };
}

async function patchVideoDescription(
  videoId: string,
  snippet: VideoSnippet,
  newDescription: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${YOUTUBE_API}/videos?part=snippet`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: videoId,
      snippet: {
        title: snippet.title,
        description: newDescription,
        categoryId: snippet.categoryId,
      },
    }),
  });
  const body = (await res.json()) as { error?: { message?: string } };
  if (!res.ok) {
    const msg = body.error?.message || `YouTube update failed (${res.status})`;
    if (isQuotaError(msg)) {
      throw new AppError(429, `quotaExceeded: ${msg}`);
    }
    throw new AppError(res.status, msg);
  }
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
): Promise<void> {
  const accessToken = await getWriteAccessToken();
  const snippet = await fetchVideoSnippet(youtubeVideoId, accessToken);
  const currentDescription = snippet.description;

  const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
  if (!episode) throw new AppError(404, 'Épisode introuvable');

  const baseDescription = episode.youtubeDescriptionOriginal
    ? episode.youtubeDescriptionOriginal
    : stripSponsorBlock(currentDescription);

  if (!episode.youtubeDescriptionOriginal) {
    await prisma.episode.update({
      where: { id: episodeId },
      data: { youtubeDescriptionOriginal: baseDescription },
    });
  }

  const sponsorBlock = buildSponsorBlock(contract);
  const newDescription = `${baseDescription}${SPONSOR_SEPARATOR}${sponsorBlock}`;

  try {
    await patchVideoDescription(youtubeVideoId, snippet, newDescription, accessToken);
    await logYoutubeAction({
      contractId: contract.id,
      youtubeVideoId,
      action: 'description_updated',
      oldDescription: currentDescription,
      newDescription,
      triggeredBy,
      success: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    await logYoutubeAction({
      contractId: contract.id,
      youtubeVideoId,
      action: 'description_updated',
      oldDescription: currentDescription,
      newDescription,
      triggeredBy,
      success: false,
      errorMessage: message,
    });
    if (err instanceof AppError && err.statusCode === 429) {
      await queueUpdate(youtubeVideoId, contract.id, 'update_description', {
        episodeId,
        contractId: contract.id,
      });
      return;
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

export async function pinSponsorComment(
  youtubeVideoId: string,
  contract: ContractWithRelations,
  episodeId: number,
  triggeredBy: YoutubeLogTrigger,
): Promise<void> {
  const accessToken = await getWriteAccessToken();
  const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
  if (!episode) throw new AppError(404, 'Épisode introuvable');

  const commentText = `📢 Partenaire : ${contract.sponsor.name}${contract.trackingUrl ? ` — ${contract.trackingUrl}` : ''}`;

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
      errorMessage: msg,
    });
    if (isQuotaError(msg)) {
      await queueUpdate(youtubeVideoId, contract.id, 'pin_comment', {
        episodeId,
        contractId: contract.id,
      });
      return;
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

  await logYoutubeAction({
    contractId: contract.id,
    youtubeVideoId,
    action: 'comment_pinned',
    newComment: commentText,
    triggeredBy,
    success: true,
  });
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
  const original =
    episode.youtubeDescriptionOriginal || stripSponsorBlock(snippet.description);

  try {
    await patchVideoDescription(youtubeVideoId, snippet, original, accessToken);

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
): Promise<void> {
  await updateVideoDescription(youtubeVideoId, contract, episodeId, triggeredBy);
  await pinSponsorComment(youtubeVideoId, contract, episodeId, triggeredBy);
}

export async function processYoutubeQueue(limit = 100): Promise<{ processed: number; failed: number }> {
  const items = await prisma.youtubeSyncQueue.findMany({
    where: { status: 'pending' },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  });

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    await prisma.youtubeSyncQueue.update({
      where: { id: item.id },
      data: { status: 'processing', attempts: { increment: 1 } },
    });

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
      await prisma.youtubeSyncQueue.update({
        where: { id: item.id },
        data: {
          status: attempts >= 3 ? 'failed' : 'pending',
          lastError: message.slice(0, 2000),
        },
      });
      failed++;
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
