import { vi } from 'vitest';

/** Doble de prueba mínimo del PrismaClient (solo lo que usan los adaptadores). */
export function createFakePrisma() {
  const reservations: any[] = [];
  const rooms: any[] = [];
  const users: any[] = [];
  const client: any = {
    user: { findUnique: vi.fn(async ({ where }: any) => users.find((u) => u.id === where.id) ?? null) },
    room: {
      findUnique: vi.fn(async ({ where }: any) => rooms.find((r) => r.id === where.id) ?? null),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const i = rooms.findIndex((r) => r.id === where.id);
        if (i >= 0) rooms[i] = { ...rooms[i], ...update };
        else rooms.push({ ...create });
      }),
    },
    reservation: {
      findUnique: vi.fn(async ({ where }: any) => reservations.find((r) => r.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: any) =>
        reservations.filter(
          (r) =>
            r.roomId === where.roomId &&
            r.status === where.status &&
            r.startTime < where.endTime.lt === undefined
              ? true
              : r.roomId === where.roomId &&
                r.status === where.status &&
                r.startTime < where.startTime.lt &&
                r.endTime > where.endTime.gt &&
                (!where.id || r.id !== where.id.not),
        ),
      ),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const i = reservations.findIndex((r) => r.id === where.id);
        if (i >= 0) reservations[i] = { ...reservations[i], ...update };
        else reservations.push({ ...create });
      }),
    },
    $transaction: vi.fn(async (fn: any, _opts?: any) => fn(client)),
  };
  return { client, reservations, rooms, users };
}
