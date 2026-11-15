import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors';
import { CreateReservation } from './CreateReservation';
import {
  FixedClock, InMemoryReservationRepository, InMemoryRoomRepository, NOW, ROOM_ID,
  SeqIds, SpyNotification, employee, local, makeReservation, makeRoom,
} from './__fakes__/inMemory';

describe('CreateReservation', () => {
  let reservations: InMemoryReservationRepository;
  let rooms: InMemoryRoomRepository;
  let notifier: SpyNotification;
  let useCase: CreateReservation;

  const input = (over: Record<string, unknown> = {}) => ({
    roomId: ROOM_ID,
    title: 'Planning',
    startTime: local('2026-11-16', '14:00').toISOString(),
    endTime: local('2026-11-16', '15:00').toISOString(),
    attendeesCount: 5,
    ...over,
  });

  beforeEach(async () => {
    reservations = new InMemoryReservationRepository();
    rooms = new InMemoryRoomRepository();
    notifier = new SpyNotification();
    await rooms.save(makeRoom());
    useCase = new CreateReservation(reservations, rooms, notifier, new FixedClock(NOW), new SeqIds());
  });

  it('crea una reserva CONFIRMED, la persiste y notifica reservations', async () => {
    const r = await useCase.execute(employee, input());
    expect(r).toMatchObject({ id: 'res-1', userId: employee.id, status: 'CONFIRMED', movedByHr: false });
    expect(reservations.items.get('res-1')).toBeDefined();
    expect(notifier.calls).toEqual(['reservations']);
  });

  it('404-like: sala inexistente -> NotFoundError', async () => {
    await expect(useCase.execute(employee, input({ roomId: OTHER }))).rejects.toBeInstanceOf(NotFoundError);
  });

  describe('choques de horario', () => {
    beforeEach(async () => {
      await reservations.save(makeReservation()); // 14:00-15:00
    });
    it.each([
      ['solape parcial inicio', '13:30', '14:30'],
      ['solape parcial fin', '14:30', '15:30'],
      ['contenida', '14:00', '15:00'],
      ['envuelve', '13:30', '15:30'],
    ])('rechaza %s con ConflictError', async (_n, s, e) => {
      await expect(
        useCase.execute(employee, input({ startTime: local('2026-11-16', s).toISOString(), endTime: local('2026-11-16', e).toISOString() })),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(notifier.calls).toEqual([]);
    });
    it('permite reservas contiguas (borde exclusivo)', async () => {
      await expect(
        useCase.execute(employee, input({ startTime: local('2026-11-16', '15:00').toISOString(), endTime: local('2026-11-16', '16:00').toISOString() })),
      ).resolves.toBeDefined();
      await expect(
        useCase.execute(employee, input({ startTime: local('2026-11-16', '13:00').toISOString(), endTime: local('2026-11-16', '14:00').toISOString() })),
      ).resolves.toBeDefined();
    });
    it('misma franja en otra sala no choca', async () => {
      await rooms.save(makeRoom({ id: OTHER, name: 'Sala B' }));
      await expect(useCase.execute(employee, input({ roomId: OTHER }))).resolves.toBeDefined();
    });
    it('una reserva CANCELLED no bloquea la franja', async () => {
      await reservations.save(makeReservation({ id: 'seed-1', status: 'CANCELLED' }));
      await expect(useCase.execute(employee, input())).resolves.toBeDefined();
    });
    it('si el repositorio detecta el solape (carrera) propaga ConflictError', async () => {
      const racy = new InMemoryReservationRepository();
      racy.findOverlapping = async () => []; // el pre-check no ve el choque
      await racy.save(makeReservation());
      const uc = new CreateReservation(racy, rooms, notifier, new FixedClock(NOW), new SeqIds());
      await expect(uc.execute(employee, input())).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('duración (30 min – 4 h)', () => {
    it.each([['14:00', '14:30'], ['14:00', '18:00']])('acepta %s-%s', async (s, e) => {
      await expect(
        useCase.execute(employee, input({ startTime: local('2026-11-16', s).toISOString(), endTime: local('2026-11-16', e).toISOString() })),
      ).resolves.toBeDefined();
    });
    it.each([['14:00', '14:00'], ['14:00', '13:30'], ['14:00', '14:15'], ['14:00', '18:30']])(
      'rechaza %s-%s', async (s, e) => {
        await expect(
          useCase.execute(employee, input({ startTime: local('2026-11-16', s).toISOString(), endTime: local('2026-11-16', e).toISOString() })),
        ).rejects.toBeInstanceOf(ValidationError);
      },
    );
  });

  describe('horario operativo (L–V 07:00–20:00, en punto o media hora)', () => {
    it('acepta 07:00-08:00 y 19:00-20:00', async () => {
      await expect(useCase.execute(employee, input({ startTime: local('2026-11-17', '07:00').toISOString(), endTime: local('2026-11-17', '08:00').toISOString() }))).resolves.toBeDefined();
      await expect(useCase.execute(employee, input({ startTime: local('2026-11-17', '19:00').toISOString(), endTime: local('2026-11-17', '20:00').toISOString() }))).resolves.toBeDefined();
    });
    it.each([['06:30', '07:30'], ['19:30', '20:30'], ['14:10', '15:00']])('rechaza %s-%s', async (s, e) => {
      await expect(
        useCase.execute(employee, input({ startTime: local('2026-11-17', s).toISOString(), endTime: local('2026-11-17', e).toISOString() })),
      ).rejects.toBeInstanceOf(ValidationError);
    });
    it('rechaza fin de semana (sábado 2026-11-21)', async () => {
      await expect(
        useCase.execute(employee, input({ startTime: local('2026-11-21', '10:00').toISOString(), endTime: local('2026-11-21', '11:00').toISOString() })),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('anticipación', () => {
    it('rechaza fechas pasadas', async () => {
      await expect(
        useCase.execute(employee, input({ startTime: local('2026-11-16', '09:00').toISOString(), endTime: local('2026-11-16', '09:30').toISOString() })),
      ).rejects.toBeInstanceOf(ValidationError);
    });
    it('acepta exactamente 14 días (lunes 2026-11-30 10:00)', async () => {
      await expect(
        useCase.execute(employee, input({ startTime: local('2026-11-30', '10:00').toISOString(), endTime: local('2026-11-30', '11:00').toISOString() })),
      ).resolves.toBeDefined();
    });
    it('rechaza más de 14 días (2026-11-30 10:30)', async () => {
      await expect(
        useCase.execute(employee, input({ startTime: local('2026-11-30', '10:30').toISOString(), endTime: local('2026-11-30', '11:30').toISOString() })),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('sala y aforo', () => {
    it('rechaza sala inactiva', async () => {
      await rooms.save(makeRoom({ isActive: false }));
      await expect(useCase.execute(employee, input())).rejects.toBeInstanceOf(ValidationError);
    });
    it('acepta aforo igual a la capacidad', async () => {
      await expect(useCase.execute(employee, input({ attendeesCount: 10 }))).resolves.toBeDefined();
    });
    it('rechaza aforo mayor a la capacidad', async () => {
      await expect(useCase.execute(employee, input({ attendeesCount: 11 }))).rejects.toBeInstanceOf(ValidationError);
    });
  });
});

const OTHER = '22222222-2222-4222-8222-222222222222';
