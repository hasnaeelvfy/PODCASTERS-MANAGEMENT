import { prisma } from '../lib/prisma';

export interface EditorialEvent {
  date: string;
  type: 'shooting' | 'publication';
  label: string;
  guestId: number;
}

export async function getEditorialCalendar(limit = 5): Promise<EditorialEvent[]> {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const events: EditorialEvent[] = [];

  const [publishedStage, recordedStage, shootingGuests] = await Promise.all([
    prisma.pipelineStage.findFirst({ where: { position: 6 } }),
    prisma.pipelineStage.findFirst({ where: { position: 5 } }),
    prisma.guest.findMany({
      where: { shootingDate: { gte: now } },
    }),
  ]);

  const [publishedEpisodes, recordedGuests] = await Promise.all([
    publishedStage
      ? prisma.episode.findMany({
          where: {
            publicationDate: { gte: now },
            guest: { stageId: publishedStage.id },
          },
          include: { guest: true },
        })
      : Promise.resolve([]),
    recordedStage
      ? prisma.guest.findMany({
          where: { stageId: recordedStage.id },
          include: { episode: true },
        })
      : Promise.resolve([]),
  ]);

  for (const ep of publishedEpisodes) {
    if (!ep.publicationDate) continue;
    const title = ep.title || `${ep.guest.firstName} ${ep.guest.lastName}`.trim();
    events.push({
      date: ep.publicationDate.toISOString(),
      type: 'publication',
      label: `📢 Publication — ${title}`,
      guestId: ep.guestId,
    });
  }

  for (const g of recordedGuests) {
    const rec = g.episode?.recordingDate;
    if (!rec || rec < now) continue;
    events.push({
      date: rec.toISOString(),
      type: 'shooting',
      label: `🎬 Tournage — ${g.firstName} ${g.lastName}`.trim(),
      guestId: g.id,
    });
  }

  for (const g of shootingGuests) {
    if (!g.shootingDate) continue;
    const label = `🎬 Tournage — ${g.firstName} ${g.lastName}`.trim();
    if (events.some((e) => e.guestId === g.id && e.label === label)) continue;
    events.push({
      date: g.shootingDate.toISOString(),
      type: 'shooting',
      label,
      guestId: g.id,
    });
  }

  return events
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);
}
