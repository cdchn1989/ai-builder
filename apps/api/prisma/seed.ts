import { createPrismaClient } from '../src/infrastructure/db/createPrismaClient';
import { runSeed } from '../src/infrastructure/db/runSeed';

const prisma = createPrismaClient();

runSeed(prisma)
  .then(({ usersCreated }) => console.log(`[seed] OK (usuarios nuevos: ${usersCreated})`))
  .catch((err) => {
    console.error('[seed] error', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
