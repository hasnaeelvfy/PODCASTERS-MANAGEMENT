import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [
      'process.env.FRONTEND_URL',
      'http://localhost:3000',
      'http://192.168.178.121:3000',
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));

app.use('/api', routes);

app.use(errorHandler);

export default app;
