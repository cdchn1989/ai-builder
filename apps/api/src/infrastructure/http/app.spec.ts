import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '@reservas/shared';
import { createApp } from './app';

describe('GET /api/v1/health', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('responde 200 con { status: "ok" }', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    expect(HealthResponseSchema.parse(await res.json())).toEqual({ status: 'ok' });
  });

  it('incluye cabecera CORS abierta', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
