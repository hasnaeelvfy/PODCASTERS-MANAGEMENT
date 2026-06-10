import { prisma } from '../lib/prisma';

export async function logActivity(message: string, userId?: number) {
  return prisma.activityLog.create({
    data: {
      message,
      userId: userId ?? null,
    },
  });
}

export async function listRecentActivity(limit = 10) {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    message: log.message,
    date: log.createdAt.toISOString(),
    userId: log.userId,
  }));
}
