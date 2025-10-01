// app/lib/db.ts
import { PrismaClient } from "@prisma/client";

// Use a pooled URL at runtime if provided (e.g., Neon/Supabase pooler).
// Fall back to DATABASE_URL for local and migrations.
const RUNTIME_DB_URL =
  process.env.DATABASE_URL_RUNTIME || process.env.DATABASE_URL;

// Keep a single client instance in dev to avoid "too many clients" hot-reload issues.
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: RUNTIME_DB_URL ? { db: { url: RUNTIME_DB_URL } } : undefined,
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["query", "error", "warn"],
    transactionOptions: {
      timeout: 60000, // 60 seconds default timeout
      maxWait: 5000, // 5 seconds max wait to get a transaction
      isolationLevel: "ReadCommitted", // More relaxed isolation for better performance
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
