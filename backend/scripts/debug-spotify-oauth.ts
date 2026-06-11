import '../src/load-env';
import { prisma } from '../src/lib/prisma';
import { oauthService } from '../src/services/oauth.service';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
    take: 5,
  });
  console.log('Users:', users);

  const userId = users[0]?.id ?? 1;
  const url = oauthService.getAuthorizationUrl('spotify', userId);
  const parsed = new URL(url);

  console.log('\n=== FULL AUTHORIZATION URL ===');
  console.log(url);
  console.log('\n=== DECODED PARAMS ===');
  for (const [k, v] of parsed.searchParams) {
    console.log(`${k} = ${v}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
