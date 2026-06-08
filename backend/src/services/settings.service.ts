import { prisma } from '../lib/prisma';
import { encryptToken, decryptToken } from '../utils/crypto';

const SENSITIVE_KEYS = new Set(['youtube_api_key']);

const DEFAULTS: Record<string, string> = {
  podcast_name: 'El Maakoul',
  podcast_description: '',
  podcast_logo: '',
  default_currency: 'MAD',
  default_language: 'fr',
  timezone: 'Africa/Casablanca',
  spotify_channel_url: '',
  notification_email: '',
  notify_shooting_reminder: 'true',
  notify_sponsor_confirmed: 'true',
  notify_weekly_report: 'false',
};

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { settingKey: key } });
  if (!row?.settingValue) return DEFAULTS[key] ?? null;
  if (SENSITIVE_KEYS.has(key)) {
    try {
      return decryptToken(row.settingValue);
    } catch {
      return row.settingValue;
    }
  }
  return row.settingValue;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const stored = SENSITIVE_KEYS.has(key) && value ? encryptToken(value) : value;
  await prisma.appSetting.upsert({
    where: { settingKey: key },
    create: { settingKey: key, settingValue: stored },
    update: { settingValue: stored },
  });
}

export async function getYoutubeApiKey(): Promise<string | null> {
  return getSetting('youtube_api_key');
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.appSetting.findMany();
  const result: Record<string, string> = { ...DEFAULTS };

  for (const row of rows) {
    if (SENSITIVE_KEYS.has(row.settingKey) && row.settingValue) {
      try {
        result[row.settingKey] = decryptToken(row.settingValue);
      } catch {
        result[row.settingKey] = '••••••••';
      }
    } else if (row.settingValue) {
      result[row.settingKey] = row.settingValue;
    }
  }

  if (result.youtube_api_key) {
    result.youtube_api_key_masked = '••••••••' + result.youtube_api_key.slice(-4);
    delete result.youtube_api_key;
  }

  return result;
}

export async function updateSettings(data: Record<string, string | null>): Promise<Record<string, string>> {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    await setSetting(key, value);
  }
  return getAllSettings();
}

export async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, fullname: true, email: true, role: true, avatar: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}
