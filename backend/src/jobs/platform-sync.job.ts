import cron from 'node-cron';
import { syncPlatformStats } from '../services/platform-sync.service';

export function startPlatformSyncJob(): void {
  cron.schedule('0 */6 * * *', async () => {
    console.log('[PlatformSync] Starting scheduled sync...');
    try {
      await syncPlatformStats();
      console.log('[PlatformSync] Sync completed.');
    } catch (err) {
      console.error('[PlatformSync] Sync failed:', err);
    }
  });

  syncPlatformStats().catch((err) => {
    console.error('[PlatformSync] Initial sync failed:', err);
  });
}
