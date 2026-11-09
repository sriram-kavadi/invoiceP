import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

prisma.$connect()
  .then(() => {
    console.log('[Database] Prisma connected successfully.');
  })
  .catch((err) => {
    console.error('[Database] Failed to connect to database:', err.message);
    process.exit(1);
  });

process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('[Database] Prisma disconnected.');
});

export default prisma;
