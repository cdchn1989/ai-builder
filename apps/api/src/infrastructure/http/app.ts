import cors from 'cors';
import express, { type Express } from 'express';
import type { HealthResponse } from '@reservas/shared';

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  app.get('/api/v1/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok' };
    res.status(200).json(body);
  });

  return app;
}
