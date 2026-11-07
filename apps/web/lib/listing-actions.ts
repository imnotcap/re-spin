'use server';

import { redirect } from 'next/navigation';
import { PgRateLimiter } from '@respin/auth';
import { requireSession } from './auth';
import { getDb } from './server';
import { createListing, setListingStatus, updateListing, type StatusAction } from './listings';
import { parseKr } from './listing-labels';
import { ensureUsername } from './profile';

export type ListingFormState = { error?: string; field?: string } | undefined;

/** Højst 20 nye annoncer i døgnet pr. bruger */
const CREATE_LIMIT = { capacity: 20, refillPerSecond: 20 / 86_400 };

const FIELD_MESSAGES: Record<string, string> = {
  title: 'Skriv en titel på 3–80 tegn.',
  description: 'Beskrivelsen må højst være 2.000 tegn.',
  category: 'Vælg en kategori.',
  subcategory: 'Vælg en type, der hører til kategorien.',
  brand: 'Mærket må højst være 60 tegn.',
  size: 'Størrelsen må højst være 20 tegn.',
  condition: 'Vælg varens stand.',
  priceOre: 'Prisen skal være mellem 1 og 100.000 kr.',
  shippingSize: 'Vælg pakkestørrelse.',
  imageKeys: 'Tilføj 1–8 billeder, og vent til de er uploadet.'
};

const str = (fd: FormData, k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : ''; };

function fields(fd: FormData) {
  const price = parseKr(str(fd, 'price'));
  return {
    title: str(fd, 'title'), description: str(fd, 'description'), category: str(fd, 'category'),
    subcategory: str(fd, 'subcategory') || undefined, brand: str(fd, 'brand') || undefined, size: str(fd, 'size') || undefined,
    condition: str(fd, 'condition'), priceOre: price ?? -1, shippingSize: str(fd, 'shippingSize')
  };
}

const fieldError = (field?: string): ListingFormState => ({ field, error: (field && FIELD_MESSAGES[field]) || 'Tjek felterne, og prøv igen.' });

export async function createListingAction(_: ListingFormState, fd: FormData): Promise<ListingFormState> {
  const current = await requireSession('/saelg/ny/');
  const db = getDb();
  if (!(await new PgRateLimiter(db, CREATE_LIMIT).consume(`listing:${current.user.id}`)).allowed) return { error: 'Du har oprettet mange annoncer i dag. Prøv igen i morgen.' };
  const imageKeys = fd.getAll('image').filter((v): v is string => typeof v === 'string').slice(0, 9);
  const r = await createListing(db, current.user.id, { ...fields(fd), imageKeys });
  if (!r.ok) return fieldError(r.field);
  await ensureUsername(db, current.user.id).catch(() => {}); // sælgere skal have en profiladresse
  redirect(`/annonce/${r.id}/?${r.moderation === 'pending' ? 'gennemgang' : 'ny'}=1`);
}

export async function updateListingAction(_: ListingFormState, fd: FormData): Promise<ListingFormState> {
  const id = str(fd, 'id');
  const current = await requireSession('/konto/annoncer/');
  const r = await updateListing(getDb(), current.user.id, id, fields(fd));
  if (!r.ok) return r.error === 'not_found' ? { error: 'Annoncen findes ikke eller kan ikke redigeres.' } : fieldError(r.field);
  redirect(`/annonce/${id}/?gemt=1`);
}

export async function listingStatusAction(fd: FormData): Promise<void> {
  const current = await requireSession('/konto/annoncer/');
  const action = str(fd, 'action') as StatusAction;
  await setListingStatus(getDb(), current.user.id, str(fd, 'id'), action);
  redirect(`/konto/annoncer/?${action === 'removed' ? 'fjernet' : 'opdateret'}=1`);
}
