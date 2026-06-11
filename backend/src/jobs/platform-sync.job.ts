import cron from 'node-cron';
import { syncPlatformStats } from '../services/platform-sync.service';
import { syncAllSpotifyStats } from '../services/spotify-data.service';

export function startPlatformSyncJob(): void {
  const runSync = async () => {
    console.log('[PlatformSync] Starting scheduled sync...');
    try {
      await syncPlatformStats();
      await syncAllSpotifyStats();
      console.log('[PlatformSync] Sync completed.');
    } catch (err) {
      console.error('[PlatformSync] Sync failed:', err);
    }
  };

  cron.schedule('0 */6 * * *', runSync);

  runSync().catch((err) => {
    console.error('[PlatformSync] Initial sync failed:', err);
  });
}
