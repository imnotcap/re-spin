/**
 * Test-hjælper: en rigtig PostgreSQL (PGlite, WASM) i hukommelsen med alle migrationer kørt.
 * Bruges til at teste constraints, triggers og betalingsflow uden en database-server.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import * as schema from './schema';
import type { Db } from './client';

export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void>; exec: (sql: string) => Promise<unknown> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  return { db: db as unknown as Db, close: () => client.close(), exec: (q: string) => client.exec(q) };
}

/** Henter den underliggende fejlmeddelelse (drizzle pakker Postgres-fejl ind) */
export async function errorMessageOf(promise: Promise<unknown>): Promise<string | null> {
  try { await promise; return null; } catch (e) {
    const err = e as { message?: string; cause?: { message?: string } };
    return `${err.message ?? ''} ${err.cause?.message ?? ''}`;
  }
}
