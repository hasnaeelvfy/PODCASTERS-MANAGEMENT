import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migratePlatformValues() {
  console.log('Starting platform value migration...');

  try {
    // Use raw SQL to update platform values before Prisma validates them
    await prisma.$executeRawUnsafe(`
      UPDATE shorts 
      SET platform = 'youtube_shorts' 
      WHERE platform = 'yt_shorts'
    `);
    
    await prisma.$executeRawUnsafe(`
      UPDATE shorts 
      SET platform = 'instagram_reels' 
      WHERE platform = 'instagram'
    `);

    // Check for any empty platform values and set them to a default
    await prisma.$executeRawUnsafe(`
      UPDATE shorts 
      SET platform = 'youtube_shorts' 
      WHERE platform = '' OR platform IS NULL
    `);

    console.log('Platform values updated successfully');

    // Now verify the changes
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM shorts
    `;
    console.log(`Total shorts in database: ${count[0].count}`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migratePlatformValues()
  .then(() => {
    console.log('Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
