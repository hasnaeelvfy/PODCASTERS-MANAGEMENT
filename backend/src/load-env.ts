import dotenv from 'dotenv';
import path from 'path';
import { existsSync, readFileSync } from 'fs';

function parseEnvFile(envPath: string) {
  const raw = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const envCandidates = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
];

let loaded = false;
for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    parseEnvFile(envPath);
    loaded = true;
    break;
  }
}

if (!loaded || !process.env.DATABASE_URL) {
  console.warn(
    '[load-env] DATABASE_URL manquant. Vérifiez backend/.env (ex: DATABASE_URL=mysql://root:@localhost:3306/podcast_crm)',
  );
}
