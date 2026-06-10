import { prisma } from '../lib/prisma';
import { getSetting, setSetting } from './settings.service';
import { sendEmail, verifySmtpConnection } from './email.service';
import { getDashboardStats } from './dashboard.service';

export interface NotificationPreferences {
  email: string;
  shootingReminder: boolean;
  sponsorConfirmed: boolean;
  weeklyReport: boolean;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const [email, shooting, sponsor, weekly] = await Promise.all([
    getSetting('notification_email'),
    getSetting('notify_shooting_reminder'),
    getSetting('notify_sponsor_confirmed'),
    getSetting('notify_weekly_report'),
  ]);

  return {
    email: email || '',
    shootingReminder: shooting === 'true',
    sponsorConfirmed: sponsor === 'true',
    weeklyReport: weekly === 'true',
  };
}

async function shouldSend(prefs: NotificationPreferences, flag: keyof Omit<NotificationPreferences, 'email'>) {
  if (!prefs.email || !prefs[flag]) return false;
  return true;
}

// ─── Shared email base layout ───────────────────────────────────────────────
function emailBase(emoji: string, title: string, accentColor: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d1a;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0d1a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#a855f7 100%);border-radius:20px 20px 0 0;padding:36px 40px;text-align:center;">
              <div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.55);font-family:Arial,sans-serif;margin-bottom:10px;">El Maakoul</div>
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1px;">🎙️ Studio CRM</div>
              <div style="width:40px;height:2px;background:rgba(255,255,255,0.3);margin:16px auto 0;border-radius:2px;"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;border-radius:0;">

              <!-- Emoji + Title -->
              <div style="text-align:center;margin-bottom:28px;">
                <div style="font-size:48px;line-height:1;margin-bottom:16px;">${emoji}</div>
                <h1 style="margin:0;font-size:22px;font-weight:700;color:#0d0d1a;font-family:Arial,sans-serif;letter-spacing:-0.3px;">${title}</h1>
              </div>

              <!-- Divider -->
              <div style="height:1px;background:linear-gradient(90deg,transparent,#e5e7eb,transparent);margin-bottom:28px;"></div>

              <!-- Dynamic content -->
              ${bodyContent}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f7ff;border-radius:0 0 20px 20px;padding:20px 40px;text-align:center;border-top:1px solid #ede9fe;">
              <p style="margin:0;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;letter-spacing:0.5px;">
                — El Maakoul Studio CRM &nbsp;·&nbsp; <span style="color:${accentColor};">Podcast Management</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ─── Sponsor Confirmed ───────────────────────────────────────────────────────
export async function sendSponsorConfirmedEmail(sponsorName: string, amount: number) {
  const prefs = await getNotificationPreferences();
  if (!(await shouldSend(prefs, 'sponsorConfirmed'))) {
    console.warn('[Email] Alerte sponsor confirmé désactivée ou email manquant');
    return { sent: false, reason: 'Alerte désactivée ou email manquant' };
  }

  const subject = `💰 Sponsor confirmé : ${sponsorName}`;

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;font-family:Arial,sans-serif;text-align:center;line-height:1.6;">
      Un nouveau sponsor vient d'être confirmé dans votre CRM.
    </p>

    <!-- Sponsor card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-radius:14px;padding:24px;text-align:center;border:1px solid #ddd6fe;">
          <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8b5cf6;font-family:Arial,sans-serif;margin-bottom:8px;">Sponsor</div>
          <div style="font-size:26px;font-weight:800;color:#0d0d1a;font-family:Arial,sans-serif;margin-bottom:12px;">${sponsorName}</div>
          <div style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;padding:8px 24px;border-radius:50px;">
            ${amount.toLocaleString('fr-FR')} MAD
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#9ca3af;font-family:Arial,sans-serif;text-align:center;">
      Connectez-vous à votre CRM pour gérer ce sponsor.
    </p>
  `;

  const html = emailBase('💰', 'Sponsor Confirmé !', '#7c3aed', body);
  const result = await sendEmail(prefs.email, subject, html);
  if (!result.sent) {
    console.warn('[Email] Sponsor confirmé non envoyé:', result.reason);
  }
  return result;
}

// ─── Test Email ──────────────────────────────────────────────────────────────
export async function sendTestNotificationEmail() {
  const prefs = await getNotificationPreferences();
  if (!prefs.email) {
    return { ok: false, message: "Renseignez l'email de notification avant de tester" };
  }

  const verify = await verifySmtpConnection();
  if (!verify.ok) return verify;

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;font-family:Arial,sans-serif;text-align:center;line-height:1.6;">
      Votre configuration email fonctionne parfaitement.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:14px;padding:24px;text-align:center;border:1px solid #bbf7d0;">
          <div style="font-size:13px;color:#16a34a;font-family:Arial,sans-serif;font-weight:600;letter-spacing:1px;">
            ✓ &nbsp; Les alertes email sont correctement configurées
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#9ca3af;font-family:Arial,sans-serif;text-align:center;">
      Vous recevrez désormais les notifications activées dans vos paramètres.
    </p>
  `;

  const html = emailBase('✅', 'Email de Test', '#16a34a', body);
  const result = await sendEmail(prefs.email, '✅ Test — El Maakoul Studio CRM', html);

  if (!result.sent) {
    return { ok: false, message: result.reason || "Échec de l'envoi" };
  }
  return { ok: true, message: `Email de test envoyé à ${prefs.email}` };
}

// ─── Shooting Reminder ───────────────────────────────────────────────────────
export async function sendShootingReminderEmails() {
  const prefs = await getNotificationPreferences();
  if (!(await shouldSend(prefs, 'shootingReminder'))) return;

  const target = new Date();
  target.setDate(target.getDate() + 7);
  const dayStart = new Date(target);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(target);
  dayEnd.setHours(23, 59, 59, 999);

  const guests = await prisma.guest.findMany({
    where: {
      shootingDate: { gte: dayStart, lte: dayEnd },
    },
  });

  for (const guest of guests) {
    const dedupeKey = `email_shooting_${guest.id}_${dayStart.toISOString().slice(0, 10)}`;
    const alreadySent = await getSetting(dedupeKey);
    if (alreadySent === 'true') continue;

    const name = `${guest.firstName} ${guest.lastName}`.trim();
    const dateStr = guest.shootingDate!.toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `🎬 Rappel tournage J-7 : ${name}`;

    const body = `
      <p style="margin:0 0 20px;font-size:15px;color:#4b5563;font-family:Arial,sans-serif;text-align:center;line-height:1.6;">
        Un tournage est prévu dans <strong style="color:#0d0d1a;">7 jours</strong>. Préparez-vous !
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
        <tr>
          <td style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border-radius:14px;padding:24px;text-align:center;border:1px solid #fed7aa;">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#ea580c;font-family:Arial,sans-serif;margin-bottom:8px;">Invité</div>
            <div style="font-size:26px;font-weight:800;color:#0d0d1a;font-family:Arial,sans-serif;margin-bottom:16px;">${name}</div>
            <div style="height:1px;background:#fed7aa;margin-bottom:16px;"></div>
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#ea580c;font-family:Arial,sans-serif;margin-bottom:8px;">Date & Heure</div>
            <div style="font-size:15px;font-weight:600;color:#431407;font-family:Arial,sans-serif;">${dateStr}</div>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;color:#9ca3af;font-family:Arial,sans-serif;text-align:center;">
        Consultez votre CRM pour voir tous les détails de cet épisode.
      </p>
    `;

    const html = emailBase('🎬', 'Rappel Tournage J-7', '#ea580c', body);
    const result = await sendEmail(prefs.email, subject, html);
    if (result.sent) {
      await setSetting(dedupeKey, 'true');
    }
  }
}

// ─── Weekly Report ───────────────────────────────────────────────────────────
export async function sendWeeklyReportEmail() {
  const prefs = await getNotificationPreferences();
  if (!(await shouldSend(prefs, 'weeklyReport'))) return;

  const weekKey = `email_weekly_${getWeekId(new Date())}`;
  const alreadySent = await getSetting(weekKey);
  if (alreadySent === 'true') return;

  const stats = await getDashboardStats();
  const { kpis, recentEpisodes, recentSponsors } = stats;

  const subject = '📊 Rapport hebdomadaire — El Maakoul Studio';

  const episodesList = recentEpisodes.slice(0, 3).map((e) => e.title).join(', ') || '—';
  const sponsorsList = recentSponsors.slice(0, 3).map((s) => s.name).join(', ') || '—';

  const body = `
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;font-family:Arial,sans-serif;text-align:center;line-height:1.6;">
      Voici votre récapitulatif de la semaine.
    </p>

    <!-- Stats grid -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td width="48%" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-radius:12px;padding:18px;text-align:center;border:1px solid #ddd6fe;">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b5cf6;font-family:Arial,sans-serif;margin-bottom:6px;">Épisodes publiés</div>
          <div style="font-size:28px;font-weight:800;color:#7c3aed;font-family:Arial,sans-serif;">${kpis.publishedEpisodes.value}</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:12px;padding:18px;text-align:center;border:1px solid #bae6fd;">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#0284c7;font-family:Arial,sans-serif;margin-bottom:6px;">Vues YouTube</div>
          <div style="font-size:28px;font-weight:800;color:#0284c7;font-family:Arial,sans-serif;">${kpis.totalYoutubeViews.value.toLocaleString('fr-FR')}</div>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td width="48%" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:18px;text-align:center;border:1px solid #bbf7d0;">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#16a34a;font-family:Arial,sans-serif;margin-bottom:6px;">Revenus confirmés</div>
          <div style="font-size:22px;font-weight:800;color:#16a34a;font-family:Arial,sans-serif;">${kpis.confirmedRevenue.value.toLocaleString('fr-FR')} MAD</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border-radius:12px;padding:18px;text-align:center;border:1px solid #fed7aa;">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ea580c;font-family:Arial,sans-serif;margin-bottom:6px;">Sponsors actifs</div>
          <div style="font-size:28px;font-weight:800;color:#ea580c;font-family:Arial,sans-serif;">${kpis.activeSponsors.value}</div>
        </td>
      </tr>
    </table>

    <!-- Recent items -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr>
        <td style="background:#f9fafb;border-radius:10px;padding:16px 20px;border:1px solid #f3f4f6;">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b7280;font-family:Arial,sans-serif;margin-bottom:6px;">Derniers épisodes</div>
          <div style="font-size:14px;color:#0d0d1a;font-family:Arial,sans-serif;font-weight:500;">${episodesList}</div>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
      <tr>
        <td style="background:#f9fafb;border-radius:10px;padding:16px 20px;border:1px solid #f3f4f6;">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b7280;font-family:Arial,sans-serif;margin-bottom:6px;">Derniers sponsors</div>
          <div style="font-size:14px;color:#0d0d1a;font-family:Arial,sans-serif;font-weight:500;">${sponsorsList}</div>
        </td>
      </tr>
    </table>
  `;

  const html = emailBase('📊', 'Rapport Hebdomadaire', '#7c3aed', body);
  const result = await sendEmail(prefs.email, subject, html);
  if (result.sent) {
    await setSetting(weekKey, 'true');
  }
}

function getWeekId(d: Date): string {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}