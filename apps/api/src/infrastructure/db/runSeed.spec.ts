import { describe, expect, it, vi } from 'vitest';
import { runSeed } from './runSeed';
import { ROOMS_SEED, USERS_SEED } from './seedData';

function fakeSeedClient() {
  const rooms = new Map<string, any>();
  const users = new Map<string, any>();
  return {
    rooms, users,
    client: {
      room: {
        upsert: vi.fn(async ({ where, update, create }: any) => {
          rooms.set(where.name, rooms.has(where.name) ? { ...rooms.get(where.name), ...update } : create);
        }),
      },
      user: {
        createMany: vi.fn(async ({ data, skipDuplicates }: any) => {
          expect(skipDuplicates).toBe(true);
          let count = 0;
          for (const u of data) if (!users.has(u.email)) { users.set(u.email, u); count++; }
          return { count };
        }),
      },
    },
  };
}

describe('runSeed', () => {
  it('inserta 5 salas (upsert) y 80 usuarios (createMany skipDuplicates)', async () => {
    const { client, rooms, users } = fakeSeedClient();
    await runSeed(client as any);
    expect(client.room.upsert).toHaveBeenCalledTimes(ROOMS_SEED.length);
    expect(rooms.size).toBe(5);
    expect(users.size).toBe(80);
  });

  it('es idempotente: ejecutarlo dos veces no duplica ni inserta nuevos usuarios', async () => {
    const { client, rooms, users } = fakeSeedClient();
    await runSeed(client as any);
    const second = await runSeed(client as any);
    expect(rooms.size).toBe(5);
    expect(users.size).toBe(USERS_SEED.length);
    expect(second.usersCreated).toBe(0);
  });

  it('el upsert de salas no pisa isActive/capacity editados por HR', async () => {
    const { client } = fakeSeedClient();
    await runSeed(client as any);
    for (const call of client.room.upsert.mock.calls) expect(call[0].update).toEqual({});
  });
});
