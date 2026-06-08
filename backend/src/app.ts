import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === frontendUrl) return callback(null, true);
      if (
        origin === 'http://localhost:3000' ||
        origin === 'http://127.0.0.1:3000'
      ) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

app.use('/api', routes);

app.use(errorHandler);

export default app;
