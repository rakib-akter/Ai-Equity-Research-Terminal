/**
 * Run a .sql file through Prisma's *runtime* query engine (DATABASE_URL).
 *
 * Why this exists: Prisma's schema engine (`prisma db push` / `migrate`) needs
 * a direct connection, but Supabase disables the IPv6 `db.<ref>.supabase.co`
 * host on some projects, leaving only the Supavisor pooler — which the schema
 * engine can't authenticate against. The runtime query engine *does* work over
 * the pooler, so we execute DDL statements through it instead.
 *
 * Usage: node scripts/db-exec.mjs prisma/sql/watchlist.sql
 * (DATABASE_URL must be set, e.g. exported from .env.local.)
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/db-exec.mjs <file.sql>");
  process.exit(1);
}

// Strip line comments, then split into individual statements.
const sql = readFileSync(file, "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const prisma = new PrismaClient();
try {
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
    console.log("OK:", stmt.replace(/\s+/g, " ").slice(0, 70));
  }
  console.log(`Done — ${statements.length} statement(s) executed.`);
} finally {
  await prisma.$disconnect();
}
