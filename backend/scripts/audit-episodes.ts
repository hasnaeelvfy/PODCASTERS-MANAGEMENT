import '../src/load-env';
import { prisma } from '../src/lib/prisma';
import {
  getDashboardStats,
  isPublishedEpisode,
  episodeViewCount,
  episodePublicationDate,
} from '../src/services/dashboard.service';

async function main() {
  const episodes = await prisma.episode.findMany({
    include: { guest: { include: { stage: true } } },
  });

  for (const e of episodes) {
    console.log({
      id: e.id,
      guest: `${e.guest.firstName} ${e.guest.lastName}`,
      stage: e.guest.stage?.name,
      published: isPublishedEpisode(e),
      views: episodeViewCount(e),
      pubDate: episodePublicationDate(e)?.toISOString().slice(0, 10) ?? null,
    });
  }

  const dash = await getDashboardStats();
  console.log('\n--- Dashboard KPIs ---');
  console.log('Published:', dash.kpis.publishedEpisodes.value);
  console.log('YouTube views:', dash.kpis.totalYoutubeViews.value);
  console.log('Chart months with data:', dash.viewsEvolution.filter((v) => v.views > 0));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
