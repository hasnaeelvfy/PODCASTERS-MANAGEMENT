import cron from 'node-cron';
import { expireDueContracts } from '../services/contract.service';
import { processYoutubeQueue } from '../services/youtube-sponsor.service';

export function startSponsorContractsJob(): void {
  cron.schedule('5 0 * * *', async () => {
    try {
      const result = await expireDueContracts();
      console.log(`[SponsorContracts] Expired ${result.expired} contract(s)`);
    } catch (err) {
      console.error('[SponsorContracts] Expiry job failed:', err);
    }
  });

  // Drain the YouTube retry queue frequently (with per-item exponential backoff)
  // so quota-deferred work doesn't wait a whole day to retry.
  cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await processYoutubeQueue(100);
      if (result.processed > 0 || result.failed > 0) {
        console.log(`[SponsorContracts] Queue processed=${result.processed} failed=${result.failed}`);
      }
    } catch (err) {
      console.error('[SponsorContracts] Queue job failed:', err);
    }
  });

  cron.schedule('0 9 1 * *', async () => {
    console.log('[SponsorContracts] Recurring contracts reminder — configure email in notification service');
  });

  console.log('[SponsorContracts] Jobs planifiés (expiration, queue YouTube, recurring)');
}
