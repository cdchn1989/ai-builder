import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors';
import { MoveReservation } from './MoveReservation';
import {
  FixedClock, InMemoryReservationRepository, InMemoryRoomRepository, NOW, OTHER_ROOM_ID,
  SpyNotification, employee, hr, local, makeReservation, makeRoom, otherEmployee,
} from './__fakes__/inMemory';

describe('MoveReservation', () => {
  let reservations: InMemoryReservationRepository;
  let rooms: InMemoryRoomRepository;
  let notifier: SpyNotification;
  let clock: FixedClock;
  let useCase: MoveReservation;

  const patch = (s: string, e: string, day = '2026-11-16') => ({
    startTime: local(day, s).toISOString(),
    endTime: local(day, e).toISOString(),
  });

  beforeEach(async () => {
    reservations = new InMemoryReservationRepository();
    rooms = new InMemoryRoomRepository();
    notifier = new SpyNotification();
    clock = new FixedClock(NOW);
    await rooms.save(makeRoom());
    await rooms.save(makeRoom({ id: OTHER_ROOM_ID, name: 'Sala B', capacity: 4 }));
    await reservations.save(makeReservation()); // emp-1, 14:00-15:00
    useCase = new MoveReservation(reservations, rooms, notifier, clock);
  });

  it('el dueño reubica su reserva; movedByHr sigue false y notifica', async () => {
    const r = await useCase.execute(employee, 'seed-1', patch('16:00', '17:00'));
    expect(r.startTime).toEqual(local('2026-11-16', '16:00'));
    expect(r.movedByHr).toBe(false);
    expect(reservations.items.get('seed-1')!.endTime).toEqual(local('2026-11-16', '17:00'));
    expect(notifier.calls).toEqual(['reservations']);
  });

  it('reserva inexistente -> NotFoundError', async () => {
    await expect(useCase.execute(employee, 'nope', patch('16:00', '17:00'))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('reserva cancelada -> ValidationError', async () => {
    await reservations.save(makeReservation({ status: 'CANCELLED' }));
    await expect(useCase.execute(employee, 'seed-1', patch('16:00', '17:00'))).rejects.toBeInstanceOf(ValidationError);
  });

  it('EMPLOYEE no puede mover reserva ajena -> ForbiddenError', async () => {
    await expect(useCase.execute(otherEmployee, 'seed-1', patch('16:00', '17:00'))).rejects.toBeInstanceOf(ForbiddenError);
    expect(notifier.calls).toEqual([]);
  });

  it('freeze window: EMPLOYEE con < 30 min -> ValidationError', async () => {
    clock.current = local('2026-11-16', '13:45');
    await expect(useCase.execute(employee, 'seed-1', patch('16:00', '17:00'))).rejects.toBeInstanceOf(ValidationError);
  });

  it('freeze window: exactamente 30 min sí se permite', async () => {
    clock.current = local('2026-11-16', '13:30');
    await expect(useCase.execute(employee, 'seed-1', patch('16:00', '17:00'))).resolves.toBeDefined();
  });

  it('HR mueve reserva ajena dentro de la freeze window y marca movedByHr', async () => {
    clock.current = local('2026-11-16', '13:50');
    const r = await useCase.execute(hr, 'seed-1', patch('16:00', '17:00'));
    expect(r.movedByHr).toBe(true);
    expect(r.userId).toBe(employee.id);
  });

  it('HR moviendo su propia reserva no marca movedByHr', async () => {
    await reservations.save(makeReservation({ id: 'hr-res', userId: hr.id, startTime: local('2026-11-16', '17:00'), endTime: local('2026-11-16', '18:00') }));
    const r = await useCase.execute(hr, 'hr-res', patch('18:00', '19:00'));
    expect(r.movedByHr).toBe(false);
  });

  it('movedByHr ya true se conserva si luego edita el dueño', async () => {
    await reservations.save(makeReservation({ movedByHr: true }));
    const r = await useCase.execute(employee, 'seed-1', patch('16:00', '17:00'));
    expect(r.movedByHr).toBe(true);
  });

  it('rechaza solape con otra reserva -> ConflictError (ignora a sí misma)', async () => {
    await reservations.save(makeReservation({ id: 'other', userId: otherEmployee.id, startTime: local('2026-11-16', '16:00'), endTime: local('2026-11-16', '17:00') }));
    await expect(useCase.execute(employee, 'seed-1', patch('16:30', '17:30'))).rejects.toBeInstanceOf(ConflictError);
    await expect(useCase.execute(employee, 'seed-1', patch('14:30', '15:30'))).resolves.toBeDefined();
  });

  it('cambia de sala validando aforo (4 asistentes caben en capacidad 4)', async () => {
    const r = await useCase.execute(employee, 'seed-1', { roomId: OTHER_ROOM_ID });
    expect(r.roomId).toBe(OTHER_ROOM_ID);
  });

  it('rechaza aforo excedido al cambiar attendeesCount', async () => {
    await expect(useCase.execute(employee, 'seed-1', { roomId: OTHER_ROOM_ID, attendeesCount: 5 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rechaza sala destino inexistente / inactiva', async () => {
    await expect(useCase.execute(employee, 'seed-1', { roomId: '33333333-3333-4333-8333-333333333333' })).rejects.toBeInstanceOf(NotFoundError);
    await rooms.save(makeRoom({ id: OTHER_ROOM_ID, isActive: false }));
    await expect(useCase.execute(employee, 'seed-1', { roomId: OTHER_ROOM_ID })).rejects.toBeInstanceOf(ValidationError);
  });

  it.each([
    ['duración > 4 h', '14:00', '18:30'],
    ['fuera de horario', '19:30', '20:30'],
    ['no alineado a media hora', '14:10', '15:00'],
  ])('revalida %s', async (_n, s, e) => {
    await expect(useCase.execute(employee, 'seed-1', patch(s, e))).rejects.toBeInstanceOf(ValidationError);
  });

  it('rechaza mover al pasado y a más de 14 días', async () => {
    await expect(useCase.execute(employee, 'seed-1', patch('09:00', '09:30'))).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(employee, 'seed-1', patch('10:30', '11:30', '2026-11-30'))).rejects.toBeInstanceOf(ValidationError);
  });

  it('editar solo el título no revalida horario (reserva ya en curso para HR)', async () => {
    clock.current = local('2026-11-16', '14:30');
    const r = await useCase.execute(hr, 'seed-1', { title: 'Nuevo título' });
    expect(r.title).toBe('Nuevo título');
    expect(r.movedByHr).toBe(true);
  });

  it('si solo cambia startTime valida la duración con el end existente', async () => {
    await expect(useCase.execute(employee, 'seed-1', { startTime: local('2026-11-16', '15:00').toISOString() })).rejects.toBeInstanceOf(ValidationError);
  });
});
