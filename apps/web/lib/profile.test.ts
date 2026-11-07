import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { createTestDb } from '@respin/db/testing';
import { ensureUsername, memberByUsername, slugifyUsername, updateProfile } from './profile';

let db: Db, close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(async () => { await close(); });

let n = 0;
async function user(displayName: string) {
  const i = ++n;
  const [u] = await db.insert(schema.users).values({ email: `p${i}@example.dk`, emailNormalized: `p${i}@example.dk`, displayName, emailVerifiedAt: new Date() }).returning();
  return u!.id;
}

describe('profilnavne', () => {
  it('laves af visningsnavnet (æøå, accenter, tegn) og er gyldige', () => {
    expect(slugifyUsername('Mette Ørsted')).toBe('mette.oersted');
    expect(slugifyUsername('  Åse & Bjørn!! ')).toBe('aase.bjoern');
    expect(slugifyUsername('Zoë')).toBe('zoe');
    expect(slugifyUsername('Al')).toBe('medlem.al');
    expect(slugifyUsername('???')).toBe('medlem');
  });

  it('gives automatisk første gang og ændres ikke ved næste kald; dubletter får et tal', async () => {
    const a = await user('Mette Ørsted'), b = await user('Mette Ørsted');
    const ua = await ensureUsername(db, a);
    expect(ua).toBe('mette.oersted');
    expect(await ensureUsername(db, a)).toBe(ua);
    const ub = await ensureUsername(db, b);
    expect(ub).toMatch(/^mette\.oersted\.\d{3,4}$/);
  });

  it('reserverede navne (inkl. testversionens sælgere) bruges ikke', async () => {
    const u = await user('sofie.vintage');
    expect(await ensureUsername(db, u)).not.toBe('sofie.vintage');
    expect(await updateProfile(db, u, { username: 'sofie.vintage', bio: '', banner: 'skov' })).toEqual({ ok: false, error: 'reserved' });
    expect(await updateProfile(db, u, { username: 'admin', bio: '', banner: 'skov' })).toEqual({ ok: false, error: 'reserved' });
  });
});

describe('profil-opdatering', () => {
  it('validerer navn, bio og banner; navne er unikke uanset store bogstaver', async () => {
    const a = await user('Anna'), b = await user('Bo');
    expect(await updateProfile(db, a, { username: 'Anna.Loppe', bio: 'Hej​ med dig ', banner: 'lime' })).toEqual({ ok: true, username: 'anna.loppe' });
    const [row] = await db.select().from(schema.users).where(eq(schema.users.id, a));
    expect(row).toMatchObject({ username: 'anna.loppe', bio: 'Hej med dig', profileBanner: 'lime' });
    expect(await updateProfile(db, b, { username: 'ANNA.LOPPE', bio: '', banner: 'lime' })).toEqual({ ok: false, error: 'taken' });
    for (const bad of ['ab', '.anna', 'anna.', 'an na', 'anna/../x', 'ånna', 'a'.repeat(31)]) {
      expect(await updateProfile(db, b, { username: bad, bio: '', banner: 'lime' }), bad).toEqual({ ok: false, error: 'invalid_username' });
    }
    expect(await updateProfile(db, b, { username: 'bo.bo', bio: 'x'.repeat(301), banner: 'lime' })).toEqual({ ok: false, error: 'invalid_bio' });
    expect(await updateProfile(db, b, { username: 'bo.bo', bio: '', banner: 'javascript:alert(1)' })).toEqual({ ok: false, error: 'invalid_banner' });
    expect(await updateProfile(db, b, { username: 'bo.bo', bio: '', banner: 'lime', userId: a })).toEqual({ ok: false, error: 'invalid_username' }); // ukendte felter afvises
  });

  it('kun aktive brugere har en offentlig profil', async () => {
    const a = await user('Carla');
    await updateProfile(db, a, { username: 'carla.c', bio: '', banner: 'nat' });
    expect((await memberByUsername(db, 'CARLA.C'))?.displayName).toBe('Carla');
    await db.update(schema.users).set({ status: 'suspended' }).where(eq(schema.users.id, a));
    expect(await memberByUsername(db, 'carla.c')).toBeNull();
    expect(await memberByUsername(db, "x' or '1'='1")).toBeNull();
  });
});
