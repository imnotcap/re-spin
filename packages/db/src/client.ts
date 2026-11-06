import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema';

/** Fælles type for produktion (postgres.js) og test (PGlite) – kode skriver kun mod denne. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface CreateDbOptions { url: string; max?: number }

/**
 * Produktionsklient. Kræver TLS (`sslmode=require` i URL'en) mod managed Postgres.
 * Brug en dedikeret DB-bruger pr. app med mindst mulige rettigheder (se docs/platform/02-security.md).
 */
export function createDb({ url, max = 10 }: CreateDbOptions): { db: Db; close: () => Promise<void> } {
  const client = postgres(url, { max, prepare: false, idle_timeout: 20, connect_timeout: 10 });
  return { db: drizzle(client, { schema }) as unknown as Db, close: () => client.end({ timeout: 5 }) };
}
