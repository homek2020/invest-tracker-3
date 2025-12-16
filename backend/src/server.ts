import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectMongo } from './data/connection';
import { env } from './config/env';
import router from './routes';
import { syncMissingCurrencyRates } from './services/currencyRate.service';

async function bootstrap() {
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
