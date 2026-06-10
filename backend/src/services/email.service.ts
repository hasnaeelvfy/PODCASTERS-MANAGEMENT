import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getSetting } from './settings.service';

let transporter: Transporter | null = null;
let transporterKey: string | null = null;

function cleanSecret(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '').replace(/\s/g, '');
}

export async function getSmtpCredentials(): Promise<{ user: string; pass: string } | null> {
  const [dbUser, dbPass, notificationEmail] = await Promise.all([
    getSetting('smtp_user'),
    getSetting('smtp_app_password'),
    getSetting('notification_email'),
  ]);

  const user = (dbUser || process.env.SMTP_USER || notificationEmail || '').trim();
  const pass = cleanSecret(dbPass || process.env.SMTP_PASS);

  if (!user || !pass) return null;
  return { user, pass };
}

export async function isEmailConfigured(): Promise<boolean> {
  const creds = await getSmtpCredentials();
  return Boolean(creds);
}

export function resetEmailTransporter() {
  transporter = null;
  transporterKey = null;
}

async function getTransporter(): Promise<Transporter | null> {
  const creds = await getSmtpCredentials();
  if (!creds) return null;

  const key = `${creds.user}:${creds.pass.slice(0, 4)}`;
  if (transporter && transporterKey === key) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: creds.user, pass: creds.pass },
  });
  transporterKey = key;
  return transporter;
}

export async function verifySmtpConnection(): Promise<{ ok: boolean; message: string }> {
  const creds = await getSmtpCredentials();
  if (!creds) {
    return {
      ok: false,
      message: 'SMTP non configuré — renseignez le compte Gmail et le mot de passe d\'application dans Paramètres → Notifications',
    };
  }

  const tx = await getTransporter();
  if (!tx) {
    return { ok: false, message: 'Impossible d\'initialiser le transporteur SMTP' };
  }

  try {
    await tx.verify();
    return { ok: true, message: `Connexion SMTP OK (${creds.user})` };
  } catch (err) {
    resetEmailTransporter();
    const raw = err instanceof Error ? err.message : 'Erreur SMTP';
    if (raw.includes('535') || raw.includes('BadCredentials') || raw.includes('EAUTH')) {
      return {
        ok: false,
        message:
          'Identifiants Gmail refusés. Activez la validation en 2 étapes, créez un mot de passe d\'application sur https://myaccount.google.com/apppasswords pour le même compte que « Compte Gmail d\'envoi », puis enregistrez-le ci-dessous.',
      };
    }
    return { ok: false, message: raw.split('\n')[0] };
  }
}

export async function sendEmail(to: string, subject: string, html: string, text?: string) {
  const creds = await getSmtpCredentials();
  if (!creds) {
    console.warn('[Email] SMTP non configuré — email non envoyé:', subject);
    return { sent: false, reason: 'SMTP non configuré' };
  }

  const tx = await getTransporter();
  if (!tx) {
    return { sent: false, reason: 'Transporteur SMTP indisponible' };
  }

  const from = creds.user;
  try {
    await tx.sendMail({
      from: `"El Maakoul Studio" <${from}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
    console.log('[Email] Envoyé:', subject, '→', to);
    return { sent: true };
  } catch (err) {
    resetEmailTransporter();
    const reason = err instanceof Error ? err.message : 'Erreur SMTP';
    console.error('[Email] Échec envoi:', subject, '→', to, reason);
    return { sent: false, reason: reason.split('\n')[0] };
  }
}
