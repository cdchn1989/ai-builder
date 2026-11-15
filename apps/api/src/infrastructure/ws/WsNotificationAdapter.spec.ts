import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { WsEventSchema } from '@reservas/shared';
import { WsNotificationAdapter } from './WsNotificationAdapter';

const client = (readyState: number) => ({ readyState, send: vi.fn() });

describe('WsNotificationAdapter.notifyDataInvalidated', () => {
  it('envía DATA_INVALIDATED con entity y timestamp a clientes OPEN', () => {
    const open = client(1);
    const adapter = new WsNotificationAdapter({ clients: new Set([open]) }, () => new Date('2026-11-16T10:00:00Z'));
    adapter.notifyDataInvalidated('reservations');
    expect(open.send).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(open.send.mock.calls[0][0]);
    expect(WsEventSchema.parse(payload)).toEqual({
      type: 'DATA_INVALIDATED', entity: 'reservations', timestamp: '2026-11-16T10:00:00.000Z',
    });
  });

  it('omite clientes que no están OPEN y emite para rooms', () => {
    const open = client(1);
    const closing = client(2);
    const closed = client(3);
    const adapter = new WsNotificationAdapter({ clients: new Set([open, closing, closed]) });
    adapter.notifyDataInvalidated('rooms');
    expect(JSON.parse(open.send.mock.calls[0][0]).entity).toBe('rooms');
    expect(closing.send).not.toHaveBeenCalled();
    expect(closed.send).not.toHaveBeenCalled();
  });

  it('un cliente que falla al enviar no impide notificar a los demás', () => {
    const bad = client(1);
    bad.send.mockImplementation(() => { throw new Error('boom'); });
    const good = client(1);
    new WsNotificationAdapter({ clients: new Set([bad, good]) }).notifyDataInvalidated('rooms');
    expect(good.send).toHaveBeenCalledTimes(1);
  });
});

describe('WsNotificationAdapter.attach (/ws)', () => {
  let server: Server;
  afterEach(() => new Promise<void>((r) => { server?.closeAllConnections?.(); server?.close(() => r()); }));

  it('un cliente conectado a /ws recibe el broadcast', async () => {
    server = createServer();
    const adapter = WsNotificationAdapter.attach(server);
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as AddressInfo).port;
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((r) => ws.once('open', () => r()));
    const message = new Promise<string>((r) => ws.once('message', (d) => r(d.toString())));
    adapter.notifyDataInvalidated('reservations');
    expect(JSON.parse(await message)).toMatchObject({ type: 'DATA_INVALIDATED', entity: 'reservations' });
    ws.close();
  });

  it('rechaza conexiones a rutas distintas de /ws', async () => {
    server = createServer();
    WsNotificationAdapter.attach(server);
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as AddressInfo).port;
    const ws = new WebSocket(`ws://127.0.0.1:${port}/otra`);
    const err = await new Promise<Error>((r) => ws.once('error', r));
    expect(err).toBeInstanceOf(Error);
  });
});
