import { z } from 'zod';

/** Usynlige/retningsskiftende tegn (zero-width, bidi-overrides) bruges til spoofing og skjult tekst → fjernes. */
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u2028\u2029]/g;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/** Al brugertekst gemmes som ren tekst (aldrig HTML) og escapes af React ved visning. */
export function normalizeUserText(input: string): string {
  return input.normalize('NFC').replace(/\r\n?/g, '\n').replace(INVISIBLE, '').replace(CONTROL, '').trim();
}

const text = (min: number, max: number) => z.string().max(max * 4).transform(normalizeUserText).pipe(z.string().min(min).max(max));

/** Samme kategorier som hjemmesiden (apps/web/lib/categories.ts) */
export const CATEGORIES = ['kvinder', 'maend', 'boern', 'hjem', 'underholdning', 'kaeledyr'] as const;
/** Fra bedst til mindst god: Ny med mærke · Ny uden mærke · Meget god · God · Tilfredsstillende */
export const CONDITIONS = ['new_with_tag', 'new_without_tag', 'very_good', 'good', 'satisfactory'] as const;
export const SHIPPING_SIZES = ['small', 'medium'] as const;
export type ListingCategory = (typeof CATEGORIES)[number];
export type ListingCondition = (typeof CONDITIONS)[number];

import { MIN_PRICE_ORE, MAX_PRICE_ORE } from './limits';
export { MIN_PRICE_ORE, MAX_PRICE_ORE };

export const createListingInput = z.object({
  title: text(3, 80),
  description: text(0, 2000),
  category: z.enum(CATEGORIES),
  /** Underkategori fra kategoriens liste (tjekkes af appen, der kender listen) */
  subcategory: text(0, 60).optional(),
  brand: text(0, 60).optional(),
  size: text(0, 20).optional(),
  condition: z.enum(CONDITIONS),
  priceOre: z.number().int().min(MIN_PRICE_ORE).max(MAX_PRICE_ORE),
  shippingSize: z.enum(SHIPPING_SIZES),
  /** Nøgler returneret af upload-flowet (aldrig filnavne/URL'er fra klienten) */
  imageKeys: z.array(z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)).min(1).max(8)
}).strict();

export const makeOfferInput = z.object({
  listingId: z.uuid(),
  amountOre: z.number().int().min(MIN_PRICE_ORE).max(MAX_PRICE_ORE)
}).strict();

export const sendMessageInput = z.object({
  conversationId: z.uuid(),
  body: text(1, 2000)
}).strict();

export type CreateListingInput = z.infer<typeof createListingInput>;
export type MakeOfferInput = z.infer<typeof makeOfferInput>;
export type SendMessageInput = z.infer<typeof sendMessageInput>;
