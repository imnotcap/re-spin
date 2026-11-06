import { eq, lt } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import type { BucketConfig, RateLimitResult, RateLimiter } from '@respin/security';
import { sha256Hex } from './crypto';

/**
 * Token bucket i Postgres: virker på tværs af alle server-instanser (i modsætning til MemoryRateLimiter).
 * Række-låsen (FOR UPDATE) gør det atomisk ved samtidige forsøg i rigtig Postgres. NB: testene kører på PGlite (én
 * forbindelse), som serialiserer alt og derfor ikke kan bevise låsen – fjern den ikke. Nøglen gemmes som hash.
 */
export class PgRateLimiter implements RateLimiter {
  constructor(private db: Db, private cfg: BucketConfig, private now: () => Date = () => new Date()) {}

  async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const k = sha256Hex(key);
    const t = this.now();
    return this.db.transaction(async (tx) => {
      await tx.insert(schema.rateLimits).values({ key: k, tokens: this.cfg.capacity, updatedAt: t }).onConflictDoNothing();
      const [row] = await tx.select().from(schema.rateLimits).where(eq(schema.rateLimits.key, k)).for('update');
      const elapsed = Math.max(0, (t.getTime() - row!.updatedAt.getTime()) / 1000);
      let tokens = Math.min(this.cfg.capacity, row!.tokens + elapsed * this.cfg.refillPerSecond);
      const allowed = tokens >= cost;
      if (allowed) tokens -= cost;
      await tx.update(schema.rateLimits).set({ tokens, updatedAt: t }).where(eq(schema.rateLimits.key, k));
      return { allowed, remaining: Math.floor(tokens), retryAfterMs: allowed ? 0 : Math.ceil(((cost - tokens) / this.cfg.refillPerSecond) * 1000) };
    });
  }
}

/** Ryd gamle nøgler (kør dagligt fra worker). */
export async function pruneRateLimits(db: Db, olderThan: Date): Promise<void> {
  await db.delete(schema.rateLimits).where(lt(schema.rateLimits.updatedAt, olderThan));
}
