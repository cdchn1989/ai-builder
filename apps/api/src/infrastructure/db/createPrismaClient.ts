import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/** Prisma 7 requiere un driver adapter explícito. */
export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error('DATABASE_URL no está definida');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
