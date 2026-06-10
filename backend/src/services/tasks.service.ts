import { TaskStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function listOpenTasks(limit = 5) {
  const tasks = await prisma.task.findMany({
    where: { status: { in: ['pending', 'in_progress'] } },
    include: {
      guest: { select: { firstName: true, lastName: true } },
      assignee: { select: { fullname: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate?.toISOString() ?? null,
    guestName: `${t.guest.firstName} ${t.guest.lastName}`.trim(),
    assignee: t.assignee?.fullname ?? null,
  }));
}

export async function markTaskDone(id: number) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new AppError(404, 'Tâche introuvable');

  const updated = await prisma.task.update({
    where: { id },
    data: { status: TaskStatus.done },
    include: {
      guest: { select: { firstName: true, lastName: true } },
      assignee: { select: { fullname: true } },
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    status: updated.status,
    dueDate: updated.dueDate?.toISOString() ?? null,
    guestName: `${updated.guest.firstName} ${updated.guest.lastName}`.trim(),
    assignee: updated.assignee?.fullname ?? null,
  };
}
