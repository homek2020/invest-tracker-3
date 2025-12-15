import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { connectMongo } from './data/connection';
import { env } from './config/env';
import router from './routes';
import { syncMissingCurrencyRates } from './services/currencyRate.service';

async function bootstrap() {
  await connectMongo();
  try {
    await syncMissingCurrencyRates();
  } catch (error) {
    console.error('Failed to sync currency rates on startup', error);
  }
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', router);

  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }

      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error_code: 'INTERNAL_ERROR', message: err?.message ?? 'Unexpected error' });
  });

  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
