import '../src/load-env';
import jwt from 'jsonwebtoken';

async function main() {
  const token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET!, {
    expiresIn: '15m',
  });

  const res = await fetch('http://localhost:4000/api/analytics/oauth/spotify/connect', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { authorizationUrl?: string };
  console.log('HTTP status:', res.status);
  if (data.authorizationUrl) {
    const u = new URL(data.authorizationUrl);
    console.log('\n=== FULL AUTHORIZATION URL (from running server) ===');
    console.log(data.authorizationUrl);
    console.log('\n=== DECODED PARAMS ===');
    for (const [k, v] of u.searchParams) {
      console.log(`${k} = ${v}`);
    }
  } else {
    console.log('Response:', data);
  }
}

main().catch(console.error);
