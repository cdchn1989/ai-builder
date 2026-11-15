import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../domain/errors';
import { createFakePrisma } from './fakePrisma';
import { PrismaRoomRepository } from './PrismaRoomRepository';

const room = { id: 'r1', name: 'Sala A', capacity: 8, equipment: 'TV', isActive: true };

describe('PrismaRoomRepository', () => {
  it('findById mapea a dominio y null si no existe', async () => {
    const { client, rooms } = createFakePrisma();
    rooms.push({ ...room, createdAt: new Date() });
    const repo = new PrismaRoomRepository(client);
    expect(await repo.findById('r1')).toEqual(room);
    expect(await repo.findById('x')).toBeNull();
  });

  it('save hace upsert por id (crea y luego actualiza)', async () => {
    const { client, rooms } = createFakePrisma();
    const repo = new PrismaRoomRepository(client);
    await repo.save(room);
    await repo.save({ ...room, isActive: false, capacity: 10 });
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toMatchObject({ id: 'r1', isActive: false, capacity: 10 });
  });

  it('findAll devuelve todas las salas como entidades de dominio', async () => {
    const { client, rooms } = createFakePrisma();
    rooms.push({ id: 'r1', name: 'A', capacity: 4, equipment: 'TV', isActive: true, createdAt: new Date() });
    expect(await new PrismaRoomRepository(client).findAll()).toEqual([
      { id: 'r1', name: 'A', capacity: 4, equipment: 'TV', isActive: true },
    ]);
  });

  it('save traduce el choque de nombre único (P2002) a ConflictError', async () => {
    const { client } = createFakePrisma();
    client.room.upsert.mockRejectedValueOnce(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));
    await expect(new PrismaRoomRepository(client).save(room)).rejects.toBeInstanceOf(ConflictError);
  });

  it('save relanza errores no relacionados con unicidad', async () => {
    const { client } = createFakePrisma();
    client.room.upsert.mockRejectedValueOnce(new Error('boom'));
    await expect(new PrismaRoomRepository(client).save(room)).rejects.toThrow('boom');
  });
});
