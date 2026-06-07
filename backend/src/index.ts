import './load-env';
import app from './app';
import { startPlatformSyncJob } from './jobs/platform-sync.job';

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT,'0.0.0.0' , () => {
  console.log(`Prodcasters API running on http://localhost:${PORT}`);
  startPlatformSyncJob();
});
