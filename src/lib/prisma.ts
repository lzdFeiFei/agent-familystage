import { PrismaClient } from "@prisma/client";

const normalizedDatabaseUrl = (process.env.DATABASE_URL || "").trim();
if (normalizedDatabaseUrl) {
  process.env.DATABASE_URL = normalizedDatabaseUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  sqliteReadyPromise: Promise<void> | undefined;
};

function isSqliteDatabase() {
  const url = (process.env.DATABASE_URL || "").trim();
  return url.startsWith("file:");
}

async function ensureSqliteSchema(base: PrismaClient) {
  if (!isSqliteDatabase()) return;
  if (!globalForPrisma.sqliteReadyPromise) {
    globalForPrisma.sqliteReadyPromise = (async () => {
      await base.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
      await base.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          secondme_user_id TEXT NOT NULL UNIQUE,
          nickname TEXT,
          avatar_url TEXT,
          shades TEXT,
          soft_memory TEXT,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          token_expires_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await base.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS agent_profiles (
          id TEXT PRIMARY KEY,
          owner_user_id TEXT NOT NULL UNIQUE,
          consent_status TEXT NOT NULL DEFAULT 'ACTIVE',
          visibility TEXT NOT NULL DEFAULT 'PUBLIC',
          display_alias TEXT,
          revoked_at DATETIME,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      await base.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS role_bindings (
          id TEXT PRIMARY KEY,
          role_key TEXT NOT NULL,
          agent_profile_id TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT 1,
          weight INTEGER NOT NULL DEFAULT 1,
          created_by_user_id TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(agent_profile_id) REFERENCES agent_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY(created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(role_key, agent_profile_id)
        );
      `);
      await base.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          viewer_user_id TEXT NOT NULL,
          role_key TEXT NOT NULL,
          agent_profile_id TEXT NOT NULL,
          scenario_key TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(viewer_user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(agent_profile_id) REFERENCES agent_profiles(id) ON DELETE CASCADE
        );
      `);
      await base.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          sender TEXT NOT NULL,
          content TEXT NOT NULL,
          masked BOOLEAN NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        );
      `);
    })();
  }
  await globalForPrisma.sqliteReadyPromise;
}

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

const enhancedPrisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        await ensureSqliteSchema(basePrisma);
        return query(args);
      },
    },
  },
}) as unknown as PrismaClient;

export const prisma = enhancedPrisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}
