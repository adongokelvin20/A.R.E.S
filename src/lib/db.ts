import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * No-op placeholder. Database tables should be created via `prisma db push`.
 * The auto-create approach caused build issues on Vercel.
 */
export async function ensureDatabase() {
  return
}
