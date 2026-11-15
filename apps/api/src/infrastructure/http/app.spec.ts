import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '@reservas/shared';
import { createApp } from './app';
import {
  FixedClock, InMemoryReservationRepository, InMemoryRoomRepository, InMemoryUserRepository,
  NOW, OTHER_ROOM_ID, ROOM_ID, SeqIds, SpyNotification, local, makeReservation, makeRoom,
} from '../../application/use-cases/__fakes__/inMemory';

const EMP = { id: 'emp-1', name: 'Carlos', email: 'c@x.com', role: 'EMPLOYEE' as const };
const EMP2 = { id: 'emp-2', name: 'María', email: 'm@x.com', role: 'EMPLOYEE' as const };
const HR = { id: 'hr-1', name: 'Ana', email: 'a@x.com', role: 'HR' as const };

describe('API REST /api/v1', () => {
  let server: Server;
  let baseUrl: string;
  let reservations: InMemoryReservationRepository;
  let rooms: InMemoryRoomRepository;
  let users: InMemoryUserRepository;
  let notifier: SpyNotification;
  let clock: FixedClock;

  beforeAll(async () => {
    reservations = new InMemoryReservationRepository();
    rooms = new InMemoryRoomRepository();
    users = new InMemoryUserRepository();
    notifier = new SpyNotification();
    clock = new FixedClock(NOW);
    server = createApp({ users, rooms, reservations, notifier, clock, ids: new SeqIds() }).listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(async () => {
    reservations.items.clear();
    rooms.items.clear();
    users.items.clear();
    notifier.calls.length = 0;
    clock.current = NOW;
    for (const u of [EMP, EMP2, HR]) users.items.set(u.id, u);
    await rooms.save(makeRoom());
    await rooms.save(makeRoom({ id: OTHER_ROOM_ID, name: 'Sala B' }));
  });

  const call = (method: string, path: string, opts: { user?: string; body?: unknown; raw?: string } = {}) =>
    fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(opts.user ? { 'x-user-id': opts.user } : {}),
      },
      body: opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
    });

  const slot = (s: string, e: string, day = '2026-11-16') => ({
    startTime: local(day, s).toISOString(), endTime: local(day, e).toISOString(),
  });
  const newBody = (over: Record<string, unknown> = {}) => ({
    roomId: ROOM_ID, title: 'Planning', ...slot('14:00', '15:00'), attendeesCount: 4, ...over,
  });

  describe('health y CORS', () => {
    it('GET /health -> 200 { status: "ok" } con CORS abierto', async () => {
      const res = await call('GET', '/health');
      expect(res.status).toBe(200);
      expect(HealthResponseSchema.parse(await res.json())).toEqual({ status: 'ok' });
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });
  });

  describe('lecturas', () => {
    it('GET /users -> HR primero', async () => {
      const body = (await (await call('GET', '/users')).json()) as { name: string }[];
      expect(body.map((u) => u.name)).toEqual(['Ana', 'Carlos', 'María']);
      expect(body[0]).not.toHaveProperty('password');
    });

    it('GET /rooms -> lista de salas', async () => {
      const body = (await (await call('GET', '/rooms')).json()) as { name: string }[];
      expect(body.map((r) => r.name)).toEqual(['Sala A', 'Sala B']);
    });

    it('GET /reservations?date= -> reservas CONFIRMED del día con nombres', async () => {
      await reservations.save(makeReservation());
      const res = await call('GET', '/reservations?date=2026-11-16');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([
        expect.objectContaining({ id: 'seed-1', userName: 'Carlos', roomName: 'Sala A', status: 'CONFIRMED' }),
      ]);
    });

    it('GET /reservations sin date o con date inválida -> 400', async () => {
      expect((await call('GET', '/reservations')).status).toBe(400);
      expect((await call('GET', '/reservations?date=ayer')).status).toBe(400);
    });
  });

  describe('autenticación (x-user-id)', () => {
    it.each([
      ['POST', '/reservations'], ['PATCH', '/reservations/seed-1'],
      ['DELETE', '/reservations/seed-1'], ['PATCH', `/rooms/${ROOM_ID}`],
    ])('%s %s sin x-user-id -> 401', async (m, p) => {
      expect((await call(m, p, { body: {} })).status).toBe(401);
    });
    it('x-user-id desconocido -> 401', async () => {
      expect((await call('POST', '/reservations', { user: 'nadie', body: newBody() })).status).toBe(401);
    });
  });

  describe('POST /reservations', () => {
    it('201 crea, devuelve ReservationDTO y emite WS reservations', async () => {
      const res = await call('POST', '/reservations', { user: EMP.id, body: newBody() });
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({
        id: 'res-1', userId: EMP.id, roomId: ROOM_ID, status: 'CONFIRMED', movedByHr: false,
        startTime: local('2026-11-16', '14:00').toISOString(),
      });
      expect(notifier.calls).toEqual(['reservations']);
    });
    it('400 si el cuerpo no cumple el esquema Zod', async () => {
      const res = await call('POST', '/reservations', { user: EMP.id, body: newBody({ title: 'x' }) });
      expect(res.status).toBe(400);
      expect(((await res.json()) as any).error.code).toBe('BAD_REQUEST');
    });
    it('400 si el JSON está malformado', async () => {
      expect((await call('POST', '/reservations', { user: EMP.id, raw: '{oops' })).status).toBe(400);
    });
    it('404 si la sala no existe', async () => {
      const res = await call('POST', '/reservations', { user: EMP.id, body: newBody({ roomId: '33333333-3333-4333-8333-333333333333' }) });
      expect(res.status).toBe(404);
    });
    it('409 si choca con otra reserva', async () => {
      await reservations.save(makeReservation());
      const res = await call('POST', '/reservations', { user: EMP2.id, body: newBody() });
      expect(res.status).toBe(409);
      expect(notifier.calls).toEqual([]);
    });
    it('422 si incumple una regla de negocio (aforo)', async () => {
      const res = await call('POST', '/reservations', { user: EMP.id, body: newBody({ attendeesCount: 11 }) });
      expect(res.status).toBe(422);
    });
  });

  describe('PATCH /reservations/:id', () => {
    beforeEach(async () => { await reservations.save(makeReservation()); });

    it('200 el dueño reubica; emite WS', async () => {
      const res = await call('PATCH', '/reservations/seed-1', { user: EMP.id, body: slot('16:00', '17:00') });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ startTime: local('2026-11-16', '16:00').toISOString(), movedByHr: false });
      expect(notifier.calls).toEqual(['reservations']);
    });
    it('200 HR reubica reserva ajena -> movedByHr true', async () => {
      const res = await call('PATCH', '/reservations/seed-1', { user: HR.id, body: slot('16:00', '17:00') });
      expect(res.status).toBe(200);
      expect(((await res.json()) as any).movedByHr).toBe(true);
    });
    it('403 empleado sobre reserva ajena', async () => {
      expect((await call('PATCH', '/reservations/seed-1', { user: EMP2.id, body: slot('16:00', '17:00') })).status).toBe(403);
    });
    it('404 reserva inexistente', async () => {
      expect((await call('PATCH', '/reservations/nope', { user: EMP.id, body: {} })).status).toBe(404);
    });
    it('409 al chocar con otra reserva', async () => {
      await reservations.save(makeReservation({ id: 'other', ...{ startTime: local('2026-11-16', '16:00'), endTime: local('2026-11-16', '17:00') }, userId: EMP2.id }));
      expect((await call('PATCH', '/reservations/seed-1', { user: EMP.id, body: slot('16:00', '17:00') })).status).toBe(409);
    });
    it('422 dentro de la freeze window', async () => {
      clock.current = local('2026-11-16', '13:45');
      expect((await call('PATCH', '/reservations/seed-1', { user: EMP.id, body: slot('16:00', '17:00') })).status).toBe(422);
    });
    it('400 con cuerpo inválido', async () => {
      expect((await call('PATCH', '/reservations/seed-1', { user: EMP.id, body: { attendeesCount: 0 } })).status).toBe(400);
    });
  });

  describe('DELETE /reservations/:id', () => {
    beforeEach(async () => { await reservations.save(makeReservation()); });

    it('200 cancela y emite WS', async () => {
      const res = await call('DELETE', '/reservations/seed-1', { user: EMP.id });
      expect(res.status).toBe(200);
      expect(((await res.json()) as any).status).toBe('CANCELLED');
      expect(notifier.calls).toEqual(['reservations']);
    });
    it('403 ajena', async () => {
      expect((await call('DELETE', '/reservations/seed-1', { user: EMP2.id })).status).toBe(403);
    });
    it('404 inexistente', async () => {
      expect((await call('DELETE', '/reservations/nope', { user: EMP.id })).status).toBe(404);
    });
    it('422 freeze window', async () => {
      clock.current = local('2026-11-16', '13:45');
      expect((await call('DELETE', '/reservations/seed-1', { user: EMP.id })).status).toBe(422);
    });
  });

  describe('PATCH /rooms/:id', () => {
    it('200 HR actualiza y emite WS rooms', async () => {
      const res = await call('PATCH', `/rooms/${ROOM_ID}`, { user: HR.id, body: { name: 'Sala Azul', isActive: false } });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ id: ROOM_ID, name: 'Sala Azul', isActive: false });
      expect(notifier.calls).toEqual(['rooms']);
    });
    it('403 empleado', async () => {
      expect((await call('PATCH', `/rooms/${ROOM_ID}`, { user: EMP.id, body: { name: 'Otra' } })).status).toBe(403);
    });
    it('404 sala inexistente', async () => {
      expect((await call('PATCH', '/rooms/nope', { user: HR.id, body: { name: 'Otra' } })).status).toBe(404);
    });
    it('400 cuerpo inválido (capacidad fuera de rango)', async () => {
      expect((await call('PATCH', `/rooms/${ROOM_ID}`, { user: HR.id, body: { capacity: 500 } })).status).toBe(400);
    });
  });

  it('ruta desconocida -> 404 JSON', async () => {
    const res = await call('GET', '/nada');
    expect(res.status).toBe(404);
    expect(((await res.json()) as any).error.code).toBe('NOT_FOUND');
  });
});
