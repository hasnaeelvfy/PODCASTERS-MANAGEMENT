import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export type NotificationType =
  | 'rappel_enregistrement'
  | 'sponsor_relance'
  | 'episode_publie'
  | 'invite_suivi';

function serializeNotification(n: {
  id: number;
  type: string | null;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.content,
    read: n.isRead,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  };
}

async function getStaffUserIds(): Promise<number[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['admin', 'editor'] } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function triggerNotification(
  userId: number,
  type: NotificationType | string,
  title: string,
  message: string,
  link?: string,
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      content: message,
      link: link ?? null,
    },
  });
  return serializeNotification(notification);
}

export async function broadcastNotification(
  type: NotificationType | string,
  title: string,
  message: string,
  link?: string,
) {
  const userIds = await getStaffUserIds();
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      content: message,
      link: link ?? null,
    })),
  });
}

export async function listNotificationsForUser(userId: number) {
  await checkStaleContactReminders();

  const [unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    unreadCount,
    notifications: notifications.map(serializeNotification),
  };
}

export async function markNotificationRead(userId: number, id: number) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification) throw new AppError(404, 'Notification introuvable');

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  return serializeNotification(updated);
}

export async function markAllNotificationsRead(userId: number) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { success: true };
}

export async function deleteNotification(userId: number, id: number) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification) throw new AppError(404, 'Notification introuvable');

  await prisma.notification.delete({ where: { id } });
  return { success: true };
}

/** Guests in "Contacté" with no update for 7+ days. */
export async function checkStaleContactReminders() {
  const contactStage = await prisma.pipelineStage.findFirst({
    where: { position: 2 },
  });
  if (!contactStage) return;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const staleGuests = await prisma.guest.findMany({
    where: {
      stageId: contactStage.id,
      updatedAt: { lte: sevenDaysAgo },
    },
  });

  for (const guest of staleGuests) {
    const name = `${guest.firstName} ${guest.lastName}`.trim();
    const link = `/guests/${guest.id}`;

    const existing = await prisma.notification.findFirst({
      where: {
        type: 'invite_suivi',
        link,
        createdAt: { gte: sevenDaysAgo },
      },
    });
    if (existing) continue;

    await broadcastNotification(
      'invite_suivi',
      '⏰ Relance invité',
      `⏰ Relance : ${name} attend une réponse depuis 7j`,
      link,
    );
  }
}
