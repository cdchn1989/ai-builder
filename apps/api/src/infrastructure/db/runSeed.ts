import type { PrismaClient } from '@prisma/client';
import { ROOMS_SEED, USERS_SEED } from './seedData';

type SeedClient = Pick<PrismaClient, 'room' | 'user'>;

/**
 * Seed idempotente: salas por `upsert` (update vacío para no pisar ediciones de HR)
 * y usuarios por `createMany` con `skipDuplicates` (email único).
 */
export async function runSeed(prisma: SeedClient): Promise<{ usersCreated: number }> {
  for (const room of ROOMS_SEED) {
    await prisma.room.upsert({ where: { name: room.name }, update: {}, create: { ...room } });
  }
  const { count } = await prisma.user.createMany({ data: USERS_SEED, skipDuplicates: true });
  return { usersCreated: count };
}
