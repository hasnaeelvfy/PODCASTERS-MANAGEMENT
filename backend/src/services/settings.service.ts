import { prisma } from '../lib/prisma';
import { encryptToken, decryptToken } from '../utils/crypto';
import { AppError } from '../middleware/errorHandler';

const SENSITIVE_KEYS = new Set(['youtube_api_key', 'smtp_app_password']);

const DEFAULTS: Record<string, string> = {
  podcast_name: 'El Maakoul',
  podcast_description: '',
  podcast_logo: '',
  default_currency: 'MAD',
  default_language: 'fr',
  timezone: 'Africa/Casablanca',
  spotify_channel_url: '',
  notification_email: '',
  smtp_user: '',
  notify_shooting_reminder: 'true',
  notify_sponsor_confirmed: 'true',
  notify_weekly_report: 'false',
};

export async function getSetting(key: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ setting_value: string | null }[]>`
    SELECT setting_value FROM app_settings WHERE setting_key = ${key} LIMIT 1
  `;
  const raw = rows[0]?.setting_value;
  if (!raw) return DEFAULTS[key] ?? null;
  if (SENSITIVE_KEYS.has(key)) {
    try {
      return decryptToken(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const stored = SENSITIVE_KEYS.has(key) && value ? encryptToken(value) : value;
  await prisma.$executeRaw`
    INSERT INTO app_settings (setting_key, setting_value, updated_at)
    VALUES (${key}, ${stored}, NOW())
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
  `;
}

export async function getYoutubeApiKey(): Promise<string | null> {
  return getSetting('youtube_api_key');
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.$queryRaw<{ setting_key: string; setting_value: string | null }[]>`
    SELECT setting_key, setting_value FROM app_settings
  `;
  const result: Record<string, string> = { ...DEFAULTS };

  for (const row of rows) {
    if (SENSITIVE_KEYS.has(row.setting_key) && row.setting_value) {
      try {
        result[row.setting_key] = decryptToken(row.setting_value);
      } catch {
        result[row.setting_key] = '••••••••';
      }
    } else if (row.setting_value) {
      result[row.setting_key] = row.setting_value;
    }
  }

  if (result.youtube_api_key) {
    result.youtube_api_key_masked = '••••••••' + result.youtube_api_key.slice(-4);
    delete result.youtube_api_key;
  }

  if (result.smtp_app_password) {
    result.smtp_app_password_masked = '••••••••';
    delete result.smtp_app_password;
  }

  return result;
}

const NOTIFICATION_KEYS = new Set([
  'notification_email',
  'smtp_user',
  'smtp_app_password',
  'notify_shooting_reminder',
  'notify_sponsor_confirmed',
  'notify_weekly_report',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function validateNotificationSettings(data: Record<string, string | null>) {
  const touchesNotifications = Object.keys(data).some((k) => NOTIFICATION_KEYS.has(k));
  if (!touchesNotifications) return;

  const current = await getAllSettings();
  const email = (data.notification_email ?? current.notification_email ?? '').trim();
  const shooting = data.notify_shooting_reminder ?? current.notify_shooting_reminder ?? 'false';
  const sponsor = data.notify_sponsor_confirmed ?? current.notify_sponsor_confirmed ?? 'false';
  const weekly = data.notify_weekly_report ?? current.notify_weekly_report ?? 'false';

  const anyEnabled = [shooting, sponsor, weekly].some((v) => v === 'true');

  if (anyEnabled && !email) {
    throw new AppError(400, "L'email de notification est requis lorsqu'une alerte est activée");
  }
  if (email && !EMAIL_REGEX.test(email)) {
    throw new AppError(400, 'Adresse email invalide');
  }
}

export async function updateSettings(data: Record<string, string | null>): Promise<Record<string, string>> {
  await validateNotificationSettings(data);

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    await setSetting(key, value);
  }

  if ('smtp_user' in data || 'smtp_app_password' in data) {
    const { resetEmailTransporter } = await import('./email.service');
    resetEmailTransporter();
  }

  return getAllSettings();
}

export async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, fullname: true, email: true, role: true, avatar: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}
