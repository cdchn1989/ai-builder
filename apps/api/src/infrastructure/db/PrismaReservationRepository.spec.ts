import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../domain/errors';
import type { Reservation } from '../../domain/entities';
import { createFakePrisma } from './fakePrisma';
import { PrismaReservationRepository } from './PrismaReservationRepository';

const d = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 16, h, m));
const make = (over: Partial<Reservation> = {}): Reservation => ({
  id: 'v1', roomId: 'r1', userId: 'u1', title: 'Daily', startTime: d(15), endTime: d(16),
  attendeesCount: 3, status: 'CONFIRMED', movedByHr: false, ...over,
});

describe('PrismaReservationRepository', () => {
  it('findById mapea a dominio y devuelve null si no existe', async () => {
    const { client, reservations } = createFakePrisma();
    reservations.push({ ...make(), createdAt: new Date(), updatedAt: new Date() });
    const repo = new PrismaReservationRepository(client);
    expect(await repo.findById('v1')).toEqual(make());
    expect(await repo.findById('zz')).toBeNull();
  });

  it('findOverlapping aplica newStart < existingEnd && newEnd > existingStart', async () => {
    const { client, reservations } = createFakePrisma();
    reservations.push(make());
    const repo = new PrismaReservationRepository(client);
    expect(await repo.findOverlapping('r1', d(15, 30), d(16, 30))).toHaveLength(1);
    expect(await repo.findOverlapping('r1', d(16), d(17))).toHaveLength(0); // contiguas
    expect(await repo.findOverlapping('r1', d(14), d(15))).toHaveLength(0);
    expect(await repo.findOverlapping('r2', d(15), d(16))).toHaveLength(0);
  });

  it('findOverlapping ignora CANCELLED y respeta excludeId', async () => {
    const { client, reservations } = createFakePrisma();
    reservations.push(make({ id: 'a' }), make({ id: 'b', status: 'CANCELLED' }));
    const repo = new PrismaReservationRepository(client);
    expect((await repo.findOverlapping('r1', d(15), d(16))).map((r) => r.id)).toEqual(['a']);
    expect(await repo.findOverlapping('r1', d(15), d(16), 'a')).toHaveLength(0);
  });

  it('save ejecuta en $transaction con aislamiento Serializable', async () => {
    const { client, reservations } = createFakePrisma();
    await new PrismaReservationRepository(client).save(make());
    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(client.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
    expect(reservations).toHaveLength(1);
  });

  it('save lanza ConflictError si hay solape CONFIRMED y no persiste', async () => {
    const { client, reservations } = createFakePrisma();
    reservations.push(make({ id: 'a' }));
    const repo = new PrismaReservationRepository(client);
    await expect(repo.save(make({ id: 'b', startTime: d(15, 30), endTime: d(16, 30) }))).rejects.toBeInstanceOf(ConflictError);
    expect(reservations).toHaveLength(1);
  });

  it('save actualiza la misma reserva sin chocar consigo misma', async () => {
    const { client, reservations } = createFakePrisma();
    const repo = new PrismaReservationRepository(client);
    await repo.save(make());
    await repo.save(make({ endTime: d(16, 30), movedByHr: true }));
    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({ endTime: d(16, 30), movedByHr: true });
  });

  it('save de una CANCELLED no valida solapes', async () => {
    const { client, reservations } = createFakePrisma();
    reservations.push(make({ id: 'a' }));
    await new PrismaReservationRepository(client).save(make({ id: 'b', status: 'CANCELLED' }));
    expect(reservations).toHaveLength(2);
  });

  it('traduce fallo de serialización de Prisma (P2034) a ConflictError', async () => {
    const { client } = createFakePrisma();
    client.$transaction.mockRejectedValueOnce(Object.assign(new Error('write conflict'), { code: 'P2034' }));
    await expect(new PrismaReservationRepository(client).save(make())).rejects.toBeInstanceOf(ConflictError);
  });

  it('propaga errores desconocidos sin enmascararlos', async () => {
    const { client } = createFakePrisma();
    client.$transaction.mockRejectedValueOnce(new Error('boom'));
    await expect(new PrismaReservationRepository(client).save(make())).rejects.toThrow('boom');
  });
});
