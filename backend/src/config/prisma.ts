import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import "dotenv/config";

// 1. Setup the PostgreSQL Connection Pool
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// 2. Wrap the pool in the Prisma Adapter
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// 3. Pass the adapter to the constructor
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter, // This satisfies the "requires adapter" error!
        log: ['query'],
    });

if (process.env.NODE_ENV !== 'production') 
    globalForPrisma.prisma = prisma;

export default prisma;