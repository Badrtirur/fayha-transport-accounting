// FAYHA TRANSPORTATION - Prisma Client Configuration
import { PrismaClient } from '@prisma/client';
import config from './index';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: config.env === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (config.env !== 'production') {
  global.prisma = prisma;
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
