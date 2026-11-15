import { describe, expect, it } from 'vitest';
import { toReservation, toRoom, toUser } from './mappers';

describe('mappers Prisma -> dominio', () => {
  it('toUser descarta campos de persistencia', () => {
    const row = { id: 'u1', name: 'Ana', email: 'a@x.com', role: 'HR' as const, createdAt: new Date() };
    expect(toUser(row)).toEqual({ id: 'u1', name: 'Ana', email: 'a@x.com', role: 'HR' });
  });

  it('toRoom descarta createdAt', () => {
    const row = { id: 'r1', name: 'Sala', capacity: 8, equipment: 'TV', isActive: true, createdAt: new Date() };
    expect(toRoom(row)).toEqual({ id: 'r1', name: 'Sala', capacity: 8, equipment: 'TV', isActive: true });
  });

  it('toReservation descarta createdAt/updatedAt y conserva Date', () => {
    const start = new Date('2026-11-16T14:00:00Z');
    const end = new Date('2026-11-16T15:00:00Z');
    const row = {
      id: 'v1', roomId: 'r1', userId: 'u1', title: 'Daily', startTime: start, endTime: end,
      attendeesCount: 3, status: 'CONFIRMED' as const, movedByHr: true,
      createdAt: new Date(), updatedAt: new Date(),
    };
    const result = toReservation(row);
    expect(result).toEqual({
      id: 'v1', roomId: 'r1', userId: 'u1', title: 'Daily', startTime: start, endTime: end,
      attendeesCount: 3, status: 'CONFIRMED', movedByHr: true,
    });
    expect(Object.keys(result)).not.toContain('createdAt');
  });
});
