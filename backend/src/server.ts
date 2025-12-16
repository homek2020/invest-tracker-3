import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectMongo } from './data/connection';
import { env } from './config/env';
import router from './routes';
import { syncMissingCurrencyRates } from './services/currencyRate.service';

async function bootstrap() {
  const publicDir = path.join(__dirname, 'public');
  const hasPublicAssets = fs.existsSync(publicDir);
  if (hasPublicAssets) {
    console.log(`Static frontend assets found at "${publicDir}". They will be served by the backend.`);
  } else {
    console.warn(
      `Static frontend assets not found at "${publicDir}". Run "npm run build:full" from the repository root to build and copy the SPA into the backend output directory.`
    );
  }

  const connectWithRetry = async (retries = 3, delayMs = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await connectMongo();
        return;
      } catch (error) {
        console.error(`Mongo connection attempt ${attempt}/${retries} failed`, error);
        if (attempt === retries) {
          console.error(
            'Unable to connect to MongoDB. Verify the database is reachable and that the client is allowed to connect (e.g., IP whitelist).'
          );
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  };

  try {
    await connectWithRetry();
  } catch (error) {
    console.error('Failed to connect to MongoDB during startup. Exiting.');
    process.exit(1);
  }
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

  if (hasPublicAssets) {
    app.use(express.static(publicDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(publicDir, 'index.html'));
    });
    console.log(`Mounted SPA assets from "${publicDir}" with catch-all route for client-side navigation.`);
  }

  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error_code: 'INTERNAL_ERROR', message: err?.message ?? 'Unexpected error' });
  });

  console.log(`Starting API server on port ${env.port}...`);
  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
