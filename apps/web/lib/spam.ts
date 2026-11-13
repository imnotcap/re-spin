import 'server-only';
/**
 * Spam-værn for beskeder og samtaler (pr. konto, i databasen, så grænserne gælder på tværs af serverinstanser).
 * Supplerer IP-grænsen i proxy.server.ts. Nye konti er strammere begrænset: bots opretter typisk en konto og
 * skriver straks til mange sælgere.
 */
import { eq } from 'drizzle-orm';
import { PgRateLimiter } from '@respin/auth';
import { schema, type Db } from '@respin/db';

export const SPAM_LIMITS = {
  /** Beskeder: højst 8 i træk (ca. én hvert 7. sekund derefter) … */
  messageBurst: { capacity: 8, refillPerSecond: 8 / 60 },
  /** … og højst 120 i timen */
  messageHour: { capacity: 120, refillPerSecond: 120 / 3600 },
  /** Nye samtaler (at skrive til en ny sælger): 15 i timen og 40 i døgnet */
  newConversationHour: { capacity: 15, refillPerSecond: 15 / 3600 },
  newConversationDay: { capacity: 40, refillPerSecond: 40 / 86_400 },
  /** Konti under et døgn gamle: højst 5 nye samtaler i timen */
  newAccountConversationHour: { capacity: 5, refillPerSecond: 5 / 3600 },
  /** Favoritter (hjerte til/fra): 120 i timen */
  favorite: { capacity: 120, refillPerSecond: 120 / 3600 }
} as const;

export const NEW_ACCOUNT_MS = 24 * 3_600_000;

const take = (db: Db, name: keyof typeof SPAM_LIMITS, key: string) => new PgRateLimiter(db, SPAM_LIMITS[name]).consume(`${name}:${key}`).then((r) => r.allowed);

/** null = ok, ellers en fejltekst til brugeren */
export async function checkMessage(db: Db, userId: string): Promise<string | null> {
  if (!(await take(db, 'messageBurst', userId))) return 'Du skriver meget hurtigt. Vent et øjeblik, og prøv igen.';
  if (!(await take(db, 'messageHour', userId))) return 'Du har sendt mange beskeder. Vent lidt, og prøv igen.';
  return null;
}

/** Før man starter en ny samtale (første besked eller første bud til en sælger) */
export async function checkNewConversation(db: Db, userId: string, now = new Date()): Promise<string | null> {
  const [u] = await db.select({ createdAt: schema.users.createdAt }).from(schema.users).where(eq(schema.users.id, userId));
  if (u && now.getTime() - u.createdAt.getTime() < NEW_ACCOUNT_MS && !(await take(db, 'newAccountConversationHour', userId))) {
    return 'Nye konti kan skrive til et begrænset antal sælgere i timen. Prøv igen lidt senere.';
  }
  if (!(await take(db, 'newConversationHour', userId))) return 'Du har skrevet til mange sælgere på kort tid. Prøv igen lidt senere.';
  if (!(await take(db, 'newConversationDay', userId))) return 'Du har skrevet til mange sælgere i dag. Prøv igen i morgen.';
  return null;
}

export const checkFavorite = (db: Db, userId: string) => take(db, 'favorite', userId);
