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
        // Postgres `ON CONFLICT DO NOTHING`: omite filas que choquen con id o name (ambos únicos).
        createMany: vi.fn(async ({ data, skipDuplicates }: any) => {
          expect(skipDuplicates).toBe(true);
          let count = 0;
          for (const r of data) {
            const clash = [...rooms.values()].some((x) => x.id === r.id || x.name === r.name);
            if (!clash) { rooms.set(r.id, { ...r }); count++; }
          }
          return { count };
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
  it('inserta 5 salas y 80 usuarios (createMany skipDuplicates)', async () => {
    const { client, rooms, users } = fakeSeedClient();
    await runSeed(client as any);
    expect(client.room.createMany).toHaveBeenCalledTimes(1);
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

  it('no pisa ediciones de HR ni crea salas nuevas si HR renombra una sala', async () => {
    const { client, rooms } = fakeSeedClient();
    await runSeed(client as any);
    const first = ROOMS_SEED[0]!;
    rooms.set(first.id, { ...rooms.get(first.id), name: 'Sala Renombrada', capacity: 9, isActive: false });
    await runSeed(client as any);
    expect(rooms.size).toBe(5);
    expect(rooms.get(first.id)).toMatchObject({ name: 'Sala Renombrada', capacity: 9, isActive: false });
  });
});
