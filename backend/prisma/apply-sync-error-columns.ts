import '../src/load-env';
import { prisma } from '../src/lib/prisma';

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE \`platform_tokens\`
      ADD COLUMN IF NOT EXISTS \`last_sync_at\` DATETIME(3) NULL,
      ADD COLUMN IF NOT EXISTS \`last_sync_error\` TEXT NULL
  `).catch(async () => {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `platform_tokens` ADD COLUMN `last_sync_at` DATETIME(3) NULL',
    ).catch(() => {});
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `platform_tokens` ADD COLUMN `last_sync_error` TEXT NULL',
    ).catch(() => {});
  });
  console.log('Sync error columns ready.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
