import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { blobOriginFromToken } from './blob-origin';

/**
 * Lager til annoncefotos og profilbilleder. Nøgler laves altid af serveren (aldrig brugerinput):
 *   listings/2026/11/<uuid>.webp      (1600 px)
 *   listings/2026/11/<uuid>-480.webp  (480 px)
 *   profiles/2026/11/<uuid>.webp      (profilbillede 512 × 512 eller banner 1600 × 400)
 * Fotos serveres fra et andet domæne end siden selv (Vercel Blob), så en fil aldrig kan køre som en del af siden.
 */
export interface ImageStore {
  put(key: string, body: Buffer, contentType: 'image/webp'): Promise<void>;
  /** Slet en fil (fx et udskiftet profilbillede). Findes filen ikke, sker der ingenting. */
  delete(key: string): Promise<void>;
  urlFor(key: string): string;
}

const UUID_PART = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
/** Profilbillede eller eget banner (samme regel som databasens CHECK på users.avatar_key / banner_key) */
export const PROFILE_IMAGE_KEY = new RegExp(`^profiles/\\d{4}/\\d{2}/${UUID_PART}\\.webp$`);
export const IMAGE_KEY = new RegExp(`^(?:listings/\\d{4}/\\d{2}/${UUID_PART}(-480)?|profiles/\\d{4}/\\d{2}/${UUID_PART})\\.webp$`);
export const thumbKey = (key: string) => key.replace(/\.webp$/, '-480.webp');

export function newImageKey(id: string, now = new Date()): string {
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `listings/${now.getUTCFullYear()}/${mm}/${id}.webp`;
}

export function newProfileImageKey(id: string, now = new Date()): string {
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `profiles/${now.getUTCFullYear()}/${mm}/${id}.webp`;
}

const assertKey = (key: string) => { if (!IMAGE_KEY.test(key)) throw new Error('Ugyldig billednøgle'); };

/** Til tests */
export class MemoryImageStore implements ImageStore {
  readonly files = new Map<string, Buffer>();
  async put(key: string, body: Buffer) { assertKey(key); this.files.set(key, body); }
  async delete(key: string) { assertKey(key); this.files.delete(key); }
  urlFor(key: string) { return `https://billeder.test/${key}`; }
}

/** Kun udvikling: filer i apps/web/.uploads, serveret af /api/billeder/fil/... (slået fra i produktion) */
export class DevFsImageStore implements ImageStore {
  constructor(private readonly root = path.join(process.cwd(), '.uploads')) {}
  async put(key: string, body: Buffer) {
    assertKey(key);
    const file = path.join(this.root, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }
  async delete(key: string) {
    assertKey(key);
    await rm(path.join(this.root, key), { force: true });
  }
  urlFor(key: string) { return `/api/billeder/fil/${key}`; }
  async read(key: string): Promise<Buffer | null> {
    if (!IMAGE_KEY.test(key)) return null;
    try { return await readFile(path.join(this.root, key)); } catch { return null; }
  }
}

/** Vercel Blob. Den offentlige adresse udledes af tokenet (vercel_blob_rw_<store-id>_<hemmelighed>) – samme regel som Vercels SDK. */
export class BlobImageStore implements ImageStore {
  private readonly base: string;
  constructor(private readonly token: string, base?: string) {
    const origin = blobOriginFromToken(token);
    if (!origin) throw new Error('BLOB_READ_WRITE_TOKEN har et ugyldigt format');
    this.base = (base ?? origin).replace(/\/+$/, '');
  }
  async put(key: string, body: Buffer, contentType: 'image/webp') {
    assertKey(key);
    const { put } = await import('@vercel/blob');
    const res = await put(key, body, { access: 'public', contentType, addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: 31_536_000, token: this.token });
    // Vi gemmer kun nøglen og beregner adressen; afviger Vercels adresse, ses det her i stedet for som døde billeder
    if (res.url !== this.urlFor(key)) console.error('billedlager: uventet adresse fra Vercel Blob – sæt BLOB_PUBLIC_BASE_URL');
  }
  async delete(key: string) {
    assertKey(key);
    const { del } = await import('@vercel/blob');
    await del(this.urlFor(key), { token: this.token });
  }
  urlFor(key: string) { return `${this.base}/${key}`; }
}

const g = globalThis as unknown as { __respinImages?: ImageStore };

export function getImageStore(): ImageStore {
  if (!g.__respinImages) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) g.__respinImages = new BlobImageStore(token, process.env.BLOB_PUBLIC_BASE_URL || undefined);
    else if (process.env.NODE_ENV !== 'production') g.__respinImages = new DevFsImageStore();
    else throw new Error('Ugyldig konfiguration: BLOB_READ_WRITE_TOKEN mangler');
  }
  return g.__respinImages;
}
