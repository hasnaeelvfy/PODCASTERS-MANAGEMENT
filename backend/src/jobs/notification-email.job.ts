import cron from 'node-cron';
import { sendShootingReminderEmails, sendWeeklyReportEmail } from '../services/notification-email.service';
import { isEmailConfigured } from '../services/email.service';

export async function startNotificationEmailJob(): Promise<void> {
  if (!(await isEmailConfigured())) {
    console.warn('[NotificationEmail] SMTP non configuré — rappels email désactivés');
    return;
  }

  // Chaque jour à 08:00 — rappels tournage J-7
  cron.schedule('0 8 * * *', async () => {
    try {
      await sendShootingReminderEmails();
    } catch (err) {
      console.error('[NotificationEmail] Shooting reminders failed:', err);
    }
  });

  // Chaque lundi à 09:00 — rapport hebdomadaire
  cron.schedule('0 9 * * 1', async () => {
    try {
      await sendWeeklyReportEmail();
    } catch (err) {
      console.error('[NotificationEmail] Weekly report failed:', err);
    }
  });

  console.log('[NotificationEmail] Jobs planifiés (tournage J-7 + rapport hebdo)');
}
