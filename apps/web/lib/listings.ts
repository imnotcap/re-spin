import 'server-only';
import { and, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type Db } from '@respin/db';
import { CATEGORIES as CATEGORY_CODES, assessMessageRisk, createListingInput, type ListingCategory, type ListingCondition } from '@respin/core';
import { CONDITION_LABEL, subsOf } from './listing-labels';
import { thumbKey, type ImageStore } from './image-store';

const { listings, listingImages, users, sellerProfiles, listingPromotions } = schema;

/** Er annoncen fremhævet lige nu (betalt, og nu ligger i perioden)? */
const promotedNow = sql<boolean>`exists (select 1 from ${listingPromotions} lp where lp.listing_id = ${listings.id} and lp.status = 'paid' and lp.starts_at <= now() and lp.ends_at > now())`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type ListingError = 'invalid_input' | 'invalid_subcategory' | 'invalid_images' | 'not_found';
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: ListingError; field?: string };

/** Det redigerbare: alt undtagen billederne */
const editInput = createListingInput.omit({ imageKeys: true });

/** Tekst der tyder på handel uden om platformen (MobilePay, telefonnummer, links) → manuel gennemgang før visning */
function moderationFor(title: string, description: string, brand?: string): 'approved' | 'pending' {
  return assessMessageRisk([title, brand ?? '', description].join('\n')).level === 'high' ? 'pending' : 'approved';
}

function checkSub(category: string, sub: string | undefined): boolean {
  return !sub || subsOf(category).includes(sub);
}

const firstIssue = (e: z.ZodError) => String(e.issues[0]?.path[0] ?? '');

/**
 * Opret annonce. Billederne skal være uploadet af SAMME bruger, være færdigbehandlede og ikke allerede
 * brugt i en anden annonce – ellers rulles alt tilbage (ingen halve annoncer, ingen lån af andres billeder).
 */
export async function createListing(db: Db, sellerId: string, raw: unknown): Promise<Result<{ id: string; moderation: 'approved' | 'pending' }>> {
  const p = createListingInput.safeParse(raw);
  if (!p.success) return { ok: false, error: 'invalid_input', field: firstIssue(p.error) };
  const v = p.data;
  if (!checkSub(v.category, v.subcategory)) return { ok: false, error: 'invalid_subcategory', field: 'subcategory' };
  if (new Set(v.imageKeys).size !== v.imageKeys.length) return { ok: false, error: 'invalid_images', field: 'imageKeys' };
  const moderation = moderationFor(v.title, v.description, v.brand);
  try {
    const id = await db.transaction(async (tx) => {
      const [row] = await tx.insert(listings).values({
        sellerId, title: v.title, description: v.description, category: v.category, subcategory: v.subcategory || null,
        brand: v.brand || null, size: v.size || null, condition: v.condition, priceOre: v.priceOre, shippingSize: v.shippingSize,
        status: 'active', moderationStatus: moderation
      }).returning({ id: listings.id });
      for (const [position, imageId] of v.imageKeys.entries()) {
        const claimed = await tx.update(listingImages).set({ listingId: row!.id, position })
          .where(and(eq(listingImages.id, imageId), eq(listingImages.ownerId, sellerId), isNull(listingImages.listingId), eq(listingImages.scanStatus, 'clean')))
          .returning({ id: listingImages.id });
        if (claimed.length !== 1) throw new ImagesError();
      }
      return row!.id;
    });
    return { ok: true, id, moderation };
  } catch (e) {
    if (e instanceof ImagesError) return { ok: false, error: 'invalid_images', field: 'imageKeys' };
    throw e;
  }
}
class ImagesError extends Error {}

/** Redigér egen annonce (ikke reserverede eller fjernede). En anden brugers id giver 'not_found' – ingen forskel at se. */
export async function updateListing(db: Db, sellerId: string, id: string, raw: unknown): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: 'not_found' };
  const p = editInput.safeParse(raw);
  if (!p.success) return { ok: false, error: 'invalid_input', field: firstIssue(p.error) };
  const v = p.data;
  if (!checkSub(v.category, v.subcategory)) return { ok: false, error: 'invalid_subcategory', field: 'subcategory' };
  const rows = await db.update(listings).set({
    title: v.title, description: v.description, category: v.category, subcategory: v.subcategory || null, brand: v.brand || null,
    size: v.size || null, condition: v.condition, priceOre: v.priceOre, shippingSize: v.shippingSize,
    moderationStatus: moderationFor(v.title, v.description, v.brand), updatedAt: new Date()
  }).where(and(eq(listings.id, id), eq(listings.sellerId, sellerId), inArray(listings.status, ['active', 'sold', 'draft'])))
    .returning({ id: listings.id });
  return rows.length ? { ok: true } : { ok: false, error: 'not_found' };
}

export type StatusAction = 'sold' | 'active' | 'removed';
const FROM: Record<StatusAction, Array<'active' | 'sold' | 'draft'>> = { sold: ['active'], active: ['sold'], removed: ['active', 'sold', 'draft'] };

/** Markér som solgt / sæt til salg igen / fjern. Reserverede annoncer (aktiv ordre) kan ikke ændres her. */
export async function setListingStatus(db: Db, sellerId: string, id: string, action: StatusAction): Promise<Result> {
  if (!UUID.test(id) || !(action in FROM)) return { ok: false, error: 'not_found' };
  const rows = await db.update(listings).set({ status: action, updatedAt: new Date() })
    .where(and(eq(listings.id, id), eq(listings.sellerId, sellerId), inArray(listings.status, FROM[action])))
    .returning({ id: listings.id });
  return rows.length ? { ok: true } : { ok: false, error: 'not_found' };
}

/* --------------------------------- Læsning --------------------------------- */

export interface ListingImage { src: string; srcSet: string; width: number | null; height: number | null }
export interface ListingCardData {
  id: string; title: string; brand: string; size: string; condition: string; price: number;
  category: ListingCategory; sub: string; createdAt: string; image: ListingImage | null;
  seller: { name: string; certified: boolean };
  /** Købt fremhævning, der kører lige nu */
  promoted?: boolean;
}

const imageOf = (store: ImageStore, key: string, width: number | null, height: number | null): ListingImage => ({
  src: store.urlFor(thumbKey(key)),
  srcSet: `${store.urlFor(thumbKey(key))} 480w, ${store.urlFor(key)} 1600w`,
  width, height
});

async function coverImages(db: Db, store: ImageStore, ids: string[]): Promise<Map<string, ListingImage>> {
  if (!ids.length) return new Map();
  const rows = await db.select({ listingId: listingImages.listingId, key: listingImages.storageKey, w: listingImages.width, h: listingImages.height })
    .from(listingImages).where(and(inArray(listingImages.listingId, ids), eq(listingImages.position, 0), eq(listingImages.scanStatus, 'clean')));
  return new Map(rows.map((r) => [r.listingId!, imageOf(store, r.key, r.w, r.h)]));
}

const cardColumns = {
  id: listings.id, title: listings.title, brand: listings.brand, size: listings.size, condition: listings.condition, priceOre: listings.priceOre,
  category: listings.category, sub: listings.subcategory, createdAt: listings.createdAt, status: listings.status,
  sellerName: users.displayName, certified: sellerProfiles.certified
};
type CardRow = { id: string; title: string; brand: string | null; size: string | null; condition: ListingCondition; priceOre: number; category: ListingCategory; sub: string | null; createdAt: Date; sellerName: string; certified: boolean | null };

const toCard = (r: CardRow, images: Map<string, ListingImage>): ListingCardData => ({
  id: r.id, title: r.title, brand: r.brand ?? '', size: r.size ?? '', condition: CONDITION_LABEL[r.condition], price: r.priceOre / 100,
  category: r.category, sub: r.sub ?? '', createdAt: r.createdAt.toISOString(), image: images.get(r.id) ?? null,
  seller: { name: r.sellerName, certified: !!r.certified }
});

/** Escape %, _ og \ i LIKE-mønstre, så søgning efter "50%" ikke matcher alt */
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const feedQuery = z.object({
  category: z.enum(CATEGORY_CODES).optional(),
  q: z.string().max(100).optional(),
  /** Kun én sælgers annoncer (profilsiden) */
  sellerId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24)
});

/** Offentligt feed: kun aktive, godkendte annoncer fra aktive brugere – nyeste først */
export async function listFeed(db: Db, store: ImageStore, input: z.input<typeof feedQuery>): Promise<ListingCardData[]> {
  const f = feedQuery.parse(input);
  const where: SQL[] = [eq(listings.status, 'active'), eq(listings.moderationStatus, 'approved'), eq(users.status, 'active')];
  if (f.category) where.push(eq(listings.category, f.category));
  if (f.sellerId) where.push(eq(listings.sellerId, f.sellerId));
  for (const w of (f.q ?? '').normalize('NFC').toLocaleLowerCase('da-DK').split(/\s+/).filter(Boolean).slice(0, 6)) {
    const pat = `%${likeEscape(w)}%`;
    where.push(sql`(${listings.title} ILIKE ${pat} OR coalesce(${listings.brand}, '') ILIKE ${pat} OR coalesce(${listings.subcategory}, '') ILIKE ${pat})`);
  }
  // Fremhævede annoncer først, derefter nyeste
  const rows = await db.select({ ...cardColumns, promoted: promotedNow }).from(listings).innerJoin(users, eq(users.id, listings.sellerId))
    .leftJoin(sellerProfiles, eq(sellerProfiles.userId, listings.sellerId))
    .where(and(...where)).orderBy(desc(promotedNow), desc(listings.createdAt)).limit(f.limit);
  const images = await coverImages(db, store, rows.map((r) => r.id));
  return rows.map((r) => ({ ...toCard(r, images), promoted: !!r.promoted })).filter((c) => c.image);
}

export interface ListingDetail extends ListingCardData {
  description: string; conditionCode: ListingCondition; parcel: 'small' | 'medium'; status: 'draft' | 'active' | 'reserved' | 'sold' | 'removed';
  moderation: 'pending' | 'approved' | 'rejected'; images: Array<ListingImage & { alt: string }>; isOwner: boolean; sellerId: string;
  /** Sælgerens profilnavn (/@/<navn>), hvis det er sat */
  sellerUsername: string | null;
}

/**
 * Én annonce. Andre ser den kun, når den er godkendt og ikke fjernet. Ejeren ser også sine egne, der
 * venter på gennemgang. Alt andet (inkl. forkert id-format) er "findes ikke".
 */
export async function getListing(db: Db, store: ImageStore, id: string, viewerId?: string | null): Promise<ListingDetail | null> {
  if (!UUID.test(id)) return null;
  const [r] = await db.select({ ...cardColumns, description: listings.description, shippingSize: listings.shippingSize, moderation: listings.moderationStatus, sellerId: listings.sellerId, userStatus: users.status, sellerUsername: users.username })
    .from(listings).innerJoin(users, eq(users.id, listings.sellerId)).leftJoin(sellerProfiles, eq(sellerProfiles.userId, listings.sellerId))
    .where(eq(listings.id, id));
  if (!r || r.status === 'removed') return null;
  const isOwner = !!viewerId && viewerId === r.sellerId;
  if (!isOwner && (r.moderation !== 'approved' || r.userStatus !== 'active' || r.status === 'draft')) return null;
  const imgs = await db.select({ key: listingImages.storageKey, w: listingImages.width, h: listingImages.height }).from(listingImages)
    .where(and(eq(listingImages.listingId, id), eq(listingImages.scanStatus, 'clean'))).orderBy(listingImages.position);
  const images = imgs.map((i, n) => ({ ...imageOf(store, i.key, i.w, i.h), alt: `${r.title}${r.brand ? ` fra ${r.brand}` : ''}, billede ${n + 1}` }));
  return {
    ...toCard(r, new Map(images[0] ? [[r.id, images[0]]] : [])), description: r.description, conditionCode: r.condition, parcel: r.shippingSize,
    status: r.status, moderation: r.moderation, images, isOwner, sellerId: r.sellerId, sellerUsername: r.sellerUsername
  };
}

/** Til redigering: kun ejerens egne, ikke fjernede/reserverede */
export async function getOwnListingForEdit(db: Db, sellerId: string, id: string) {
  if (!UUID.test(id)) return null;
  const [r] = await db.select().from(listings).where(and(eq(listings.id, id), eq(listings.sellerId, sellerId), inArray(listings.status, ['active', 'sold', 'draft'])));
  return r ?? null;
}

export interface MyListing extends ListingCardData { status: ListingDetail['status']; moderation: ListingDetail['moderation'] }

export async function myListings(db: Db, store: ImageStore, sellerId: string): Promise<MyListing[]> {
  const rows = await db.select({ ...cardColumns, moderation: listings.moderationStatus }).from(listings)
    .innerJoin(users, eq(users.id, listings.sellerId)).leftJoin(sellerProfiles, eq(sellerProfiles.userId, listings.sellerId))
    .where(and(eq(listings.sellerId, sellerId), inArray(listings.status, ['draft', 'active', 'reserved', 'sold'])))
    .orderBy(desc(listings.createdAt)).limit(200);
  const images = await coverImages(db, store, rows.map((r) => r.id));
  return rows.map((r) => ({ ...toCard(r, images), status: r.status, moderation: r.moderation }));
}

/* --------------------------------- Upload --------------------------------- */

/** Højst så mange billeder, der ikke er brugt i en annonce, pr. bruger (mod at bruge lageret som gratis filhotel) */
export const MAX_PENDING_IMAGES = 40;

export async function pendingImageCount(db: Db, ownerId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(listingImages).where(and(eq(listingImages.ownerId, ownerId), isNull(listingImages.listingId)));
  return r?.n ?? 0;
}

/** Gem et færdigbehandlet billede: først i lageret, derefter rækken (så en række aldrig peger på en manglende fil) */
export async function saveProcessedImage(db: Db, store: ImageStore, ownerId: string, img: { id: string; key: string; main: Buffer; thumb: Buffer; width: number; height: number }) {
  await store.put(img.key, img.main, 'image/webp');
  await store.put(thumbKey(img.key), img.thumb, 'image/webp');
  await db.insert(listingImages).values({ id: img.id, ownerId, storageKey: img.key, contentType: 'image/webp', bytes: img.main.length, width: img.width, height: img.height, scanStatus: 'clean' });
  return { id: img.id, url: store.urlFor(thumbKey(img.key)) };
}
