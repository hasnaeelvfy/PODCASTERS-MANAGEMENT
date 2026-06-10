import './load-env';
import os from 'os';
import app from './app';
import { startPlatformSyncJob } from './jobs/platform-sync.job';
import { startNotificationEmailJob } from './jobs/notification-email.job';
import { startSponsorContractsJob } from './jobs/sponsor-contracts.job';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

function getLanAddresses(): string[] {
  const nets = os.networkInterfaces();
  const addresses: string[] = [];
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

app.listen(PORT, HOST, () => {
  console.log(`Prodcasters API running on http://localhost:${PORT}`);
  const lan = process.env.LAN_IP || getLanAddresses()[0];
  if (lan) {
    console.log(`  LAN: http://${lan}:${PORT} (phone on same WiFi)`);
  }
  startPlatformSyncJob();
  void startNotificationEmailJob();
  startSponsorContractsJob();
});
