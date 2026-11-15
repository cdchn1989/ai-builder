import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';
import type { WsEvent } from '@reservas/shared';
import type { NotificationPort } from '../../domain/ports';

const OPEN = 1; // WebSocket.OPEN

interface WsClientLike {
  readyState: number;
  send(data: string): void;
}

/** Broadcast en memoria (sin Redis): una única instancia single-tenant (D-05). */
export class WsNotificationAdapter implements NotificationPort {
  constructor(
    private readonly wss: { clients: Set<WsClientLike> },
    private readonly now: () => Date = () => new Date(),
  ) {}

  static attach(server: Server, path = '/ws'): WsNotificationAdapter {
    return new WsNotificationAdapter(new WebSocketServer({ server, path }));
  }

  notifyDataInvalidated(entity: WsEvent['entity']): void {
    const event: WsEvent = { type: 'DATA_INVALIDATED', entity, timestamp: this.now().toISOString() };
    const payload = JSON.stringify(event);
    for (const client of this.wss.clients) {
      if (client.readyState !== OPEN) continue;
      try {
        client.send(payload);
      } catch (err) {
        console.error('[ws] fallo al enviar a un cliente:', err);
      }
    }
  }
}
