import type { PrismaClient } from '@prisma/client';
import { ROOMS_SEED, USERS_SEED } from './seedData';

type SeedClient = Pick<PrismaClient, 'room' | 'user'>;

/**
 * Seed idempotente con `createMany` + `skipDuplicates` (ON CONFLICT DO NOTHING):
 * salas por id fijo (nunca pisa ni duplica salas editadas/renombradas por HR)
 * y usuarios por email único.
 */
export async function runSeed(prisma: SeedClient): Promise<{ usersCreated: number }> {
  await prisma.room.createMany({ data: ROOMS_SEED.map((r) => ({ ...r })), skipDuplicates: true });
  const { count } = await prisma.user.createMany({ data: USERS_SEED, skipDuplicates: true });
  return { usersCreated: count };
}
