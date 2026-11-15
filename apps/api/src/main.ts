import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createApp } from './infrastructure/http/app';
import { createPrismaClient } from './infrastructure/db/createPrismaClient';
import { PrismaReservationRepository } from './infrastructure/db/PrismaReservationRepository';
import { PrismaRoomRepository } from './infrastructure/db/PrismaRoomRepository';
import { PrismaUserRepository } from './infrastructure/db/PrismaUserRepository';
import { WsNotificationAdapter } from './infrastructure/ws/WsNotificationAdapter';

const port = Number(process.env.PORT ?? 3000);
const prisma = createPrismaClient();

const server = createServer();
const notifier = WsNotificationAdapter.attach(server, '/ws');
server.on(
  'request',
  createApp({
    users: new PrismaUserRepository(prisma),
    rooms: new PrismaRoomRepository(prisma),
    reservations: new PrismaReservationRepository(prisma),
    notifier,
    clock: { now: () => new Date() },
    ids: { next: () => randomUUID() },
  }),
);

server.listen(port, '0.0.0.0', () => {
  console.log(`[api] escuchando en http://0.0.0.0:${port} (WS en /ws)`);
});
