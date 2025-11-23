import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectMongo } from './data/connection';
import { env } from './config/env';
import router from './routes';

async function bootstrap() {
  await connectMongo();
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

  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
