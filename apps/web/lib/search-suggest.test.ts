import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { MemoryImageStore, newImageKey } from './image-store';
import { createListing, saveProcessedImage } from './listings';
import { matchBrands, suggest } from './search-suggest';

let db: Db, close: () => Promise<void>;
const store = new MemoryImageStore();
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

describe('forslag i søgefeltet', () => {
  it('mærker: dem der starter med søgningen først, derefter flest varer', () => {
    const all = [{ brand: 'Organic Basics', count: 9 }, { brand: 'Ganni', count: 3 }, { brand: 'Gant', count: 5 }];
    expect(matchBrands(all, 'gan').map((b) => b.brand)).toEqual(['Gant', 'Ganni', 'Organic Basics']);
    expect(matchBrands(all, 'g')).toEqual([]);
  });

  it('varer, personer og mærker – og kun personer med @', async () => {
    const [u] = await db.insert(schema.users).values({ email: 'f@example.dk', emailNormalized: 'f@example.dk', displayName: 'Frida Forslag', username: 'frida', emailVerifiedAt: new Date() }).returning();
    const id = crypto.randomUUID();
    await saveProcessedImage(db, store, u!.id, { id, key: newImageKey(id), main: Buffer.from('m'), thumb: Buffer.from('t'), width: 10, height: 10 });
    const r = await createListing(db, u!.id, { title: 'Fridas forslagsjakke', description: '', category: 'kvinder', condition: 'very_good', priceOre: 40_000, shippingSize: 'small', imageKeys: [id], brand: 'Ganni' });
    if (!r.ok) throw new Error(r.error);
    await db.update(schema.listings).set({ moderationStatus: 'approved', status: 'active' }).where(eq(schema.listings.id, r.id));

    const s = await suggest(db, store, [{ brand: 'Ganni', count: 1 }], 'frida');
    expect(s.listings).toEqual([expect.objectContaining({ id: r.id, title: 'Fridas forslagsjakke', price: 400 })]);
    expect(s.people.map((p) => p.username)).toEqual(['frida']);
    const only = await suggest(db, store, [], '@frida');
    expect(only.listings).toEqual([]);
    expect(only.people).toHaveLength(1);
    expect(await suggest(db, store, [], 'f')).toEqual({ listings: [], people: [], brands: [] });
  });
});
