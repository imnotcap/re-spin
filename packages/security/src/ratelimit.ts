/**
 * Rate limiting (token bucket). `MemoryRateLimiter` er til test og enkeltprocess; i produktion bruges
 * en delt store (Redis/Upstash) bag samme interface, så grænserne gælder på tværs af instanser.
 */
export interface RateLimitResult { allowed: boolean; remaining: number; retryAfterMs: number }
export interface RateLimiter { consume(key: string, cost?: number): Promise<RateLimitResult> }

export interface BucketConfig { capacity: number; refillPerSecond: number }

/** Anbefalede grænser (justeres efter målinger) */
export const LIMITS = {
  login: { capacity: 5, refillPerSecond: 5 / 900 },          // 5 forsøg, derefter 1 pr. 3 min.
  signup: { capacity: 3, refillPerSecond: 3 / 3600 },
  passwordReset: { capacity: 3, refillPerSecond: 3 / 3600 },
  message: { capacity: 30, refillPerSecond: 0.2 },
  createListing: { capacity: 10, refillPerSecond: 10 / 3600 },
  upload: { capacity: 30, refillPerSecond: 0.1 },
  search: { capacity: 60, refillPerSecond: 1 },
  adminAny: { capacity: 120, refillPerSecond: 2 }
} as const satisfies Record<string, BucketConfig>;

export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { tokens: number; updated: number }>();
  constructor(private cfg: BucketConfig, private now: () => number = Date.now, private maxKeys = 10_000) {}

  async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const t = this.now();
    const b = this.buckets.get(key) ?? { tokens: this.cfg.capacity, updated: t };
    b.tokens = Math.min(this.cfg.capacity, b.tokens + ((t - b.updated) / 1000) * this.cfg.refillPerSecond);
    b.updated = t;
    const allowed = b.tokens >= cost;
    if (allowed) b.tokens -= cost;
    this.buckets.delete(key); // genindsæt sidst → ældste først ved evicting (Map bevarer indsættelsesrækkefølge)
    this.buckets.set(key, b);
    if (this.buckets.size > this.maxKeys) this.buckets.delete(this.buckets.keys().next().value as string); // begræns hukommelse (DoS-beskyttelse)
    return { allowed, remaining: Math.floor(b.tokens), retryAfterMs: allowed ? 0 : Math.ceil(((cost - b.tokens) / this.cfg.refillPerSecond) * 1000) };
  }
}

/** Nøgle pr. handling og identitet. Kombinér IP og konto, så én angriber ikke kan låse en andens konto ude alene. */
export const limiterKey = (scope: string, ...parts: Array<string | null | undefined>): string =>
  `${scope}:${parts.map((p) => p ?? '-').join(':')}`;
