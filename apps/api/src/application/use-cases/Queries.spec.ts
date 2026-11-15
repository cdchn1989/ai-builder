import { beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '../../domain/errors';
import { ListReservations } from './ListReservations';
import { ListRooms } from './ListRooms';
import { ListUsers } from './ListUsers';
import {
  InMemoryReservationRepository, InMemoryRoomRepository, InMemoryUserRepository,
  OTHER_ROOM_ID, ROOM_ID, employee, local, makeReservation, makeRoom,
} from './__fakes__/inMemory';

describe('ListUsers', () => {
  it('ordena HR primero y luego por nombre', async () => {
    const users = new InMemoryUserRepository();
    users.items.set('1', { id: '1', name: 'Zoe', email: 'z@x.com', role: 'EMPLOYEE' });
    users.items.set('2', { id: '2', name: 'Bruno', email: 'b@x.com', role: 'HR' });
    users.items.set('3', { id: '3', name: 'Ana', email: 'a@x.com', role: 'EMPLOYEE' });
    const result = await new ListUsers(users).execute();
    expect(result.map((u) => u.name)).toEqual(['Bruno', 'Ana', 'Zoe']);
  });
});

describe('ListRooms', () => {
  it('devuelve las salas ordenadas por nombre', async () => {
    const rooms = new InMemoryRoomRepository();
    await rooms.save(makeRoom({ id: 'b', name: 'Sala B' }));
    await rooms.save(makeRoom({ id: 'a', name: 'Sala A' }));
    expect((await new ListRooms(rooms).execute()).map((r) => r.name)).toEqual(['Sala A', 'Sala B']);
  });
});

describe('ListReservations', () => {
  let reservations: InMemoryReservationRepository;
  let rooms: InMemoryRoomRepository;
  let users: InMemoryUserRepository;
  let useCase: ListReservations;

  beforeEach(async () => {
    reservations = new InMemoryReservationRepository();
    rooms = new InMemoryRoomRepository();
    users = new InMemoryUserRepository();
    await rooms.save(makeRoom());
    await rooms.save(makeRoom({ id: OTHER_ROOM_ID, name: 'Sala B' }));
    users.items.set(employee.id, { id: employee.id, name: 'Carlos', email: 'c@x.com', role: 'EMPLOYEE' });
    useCase = new ListReservations(reservations, rooms, users);
  });

  it('devuelve las CONFIRMED del día (hora local UTC-6) con userName y roomName', async () => {
    await reservations.save(makeReservation({ id: 'late', startTime: local('2026-11-16', '19:00'), endTime: local('2026-11-16', '20:00') }));
    await reservations.save(makeReservation({ id: 'early', startTime: local('2026-11-16', '07:00'), endTime: local('2026-11-16', '08:00') }));
    await reservations.save(makeReservation({ id: 'next', startTime: local('2026-11-17', '09:00'), endTime: local('2026-11-17', '10:00') }));
    await reservations.save(makeReservation({ id: 'cx', status: 'CANCELLED', roomId: OTHER_ROOM_ID }));
    const result = await useCase.execute('2026-11-16');
    expect(result.map((r) => r.id)).toEqual(['early', 'late']); // ordenadas por inicio
    expect(result[0]).toMatchObject({
      userName: 'Carlos', roomName: 'Sala A', status: 'CONFIRMED', movedByHr: false,
      startTime: local('2026-11-16', '07:00').toISOString(),
    });
  });

  it('rechaza fechas con formato inválido con ValidationError', async () => {
    await expect(useCase.execute('16-11-2026')).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute('2026-13-45')).rejects.toBeInstanceOf(ValidationError);
  });
});
