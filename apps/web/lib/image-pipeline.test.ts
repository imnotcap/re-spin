import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processImage } from './image-pipeline';
import { BlobImageStore, IMAGE_KEY, MemoryImageStore, newImageKey, thumbKey } from './image-store';

const photo = (w: number, h: number, fmt: 'jpeg' | 'png' | 'webp' = 'jpeg') =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 90, b: 60 } } })[fmt]().toBuffer();

describe('billed-pipeline', () => {
  it('omkoder til WebP i to størrelser og fjerner EXIF/GPS og ekstra data', async () => {
    const withGps = await sharp(await photo(2400, 1800)).withExif({ IFD0: { Make: 'TestCam', Copyright: 'x' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '55/1 40/1 0/1' } }).jpeg().toBuffer();
    expect((await sharp(withGps).metadata()).exif).toBeDefined();
    const r = await processImage(withGps, { declaredType: 'image/jpeg' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const main = await sharp(r.image.main).metadata(), thumb = await sharp(r.image.thumb).metadata();
    expect([main.format, main.width, main.height, main.exif, main.icc, main.xmp]).toEqual(['webp', 1600, 1200, undefined, undefined, undefined]);
    expect([thumb.format, thumb.width, thumb.height]).toEqual(['webp', 480, 360]);
  });

  it('roterer efter EXIF-orientering, så billedet vender rigtigt uden metadata', async () => {
    const rotated = await sharp(await photo(800, 400)).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const r = await processImage(rotated);
    if (!r.ok) throw new Error(r.error);
    expect([r.image.width, r.image.height]).toEqual([400, 800]);
  });

  it('forstørrer ikke små billeder og tager PNG og WebP', async () => {
    for (const fmt of ['png', 'webp'] as const) {
      const r = await processImage(await photo(600, 600, fmt));
      expect(r.ok && [r.image.width, r.image.height]).toEqual([600, 600]);
    }
  });

  it('afviser SVG, GIF, HTML, forkert deklareret type, for små, for store og dekompressionsbomber', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="900" height="900"/></svg>');
    expect(await processImage(svg)).toEqual({ ok: false, error: 'unsupported_type' });
    expect(await processImage(await sharp(await photo(300, 300)).gif().toBuffer())).toEqual({ ok: false, error: 'unsupported_type' });
    expect(await processImage(Buffer.from('<!doctype html><script>alert(1)</script>'))).toEqual({ ok: false, error: 'unsupported_type' });
    expect(await processImage(await photo(400, 400, 'png'), { declaredType: 'image/jpeg' })).toEqual({ ok: false, error: 'type_mismatch' });
    expect(await processImage(await photo(150, 400))).toEqual({ ok: false, error: 'too_small' });
    expect(await processImage(new Uint8Array(0))).toEqual({ ok: false, error: 'empty' });
    const big = new Uint8Array(4 * 1024 * 1024 + 1); big.set([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(await processImage(big)).toEqual({ ok: false, error: 'too_large' });
    expect(await processImage(await photo(2000, 1000), { maxPixels: 1_000_000 })).toEqual({ ok: false, error: 'too_many_pixels' });
  });

  it('afviser en afkortet/ødelagt JPEG', async () => {
    const jpg = await photo(800, 800);
    expect(await processImage(jpg.subarray(0, Math.floor(jpg.length / 2)))).toEqual({ ok: false, error: 'unreadable' });
  });

  it('polyglot: HTML gemt efter JPEG-data overlever ikke omkodningen', async () => {
    const poly = Buffer.concat([await photo(400, 400), Buffer.from('<script>alert(document.cookie)</script>')]);
    const r = await processImage(poly);
    if (!r.ok) throw new Error(r.error);
    expect(r.image.main.includes(Buffer.from('<script>'))).toBe(false);
  });
});

describe('billedlager', () => {
  it('nøgler laves af serveren og kan ikke bruges til at gå ud af mappen', async () => {
    const key = newImageKey('0b8c1a6e-3f4d-4e5a-9b6c-7d8e9f0a1b2c', new Date('2026-11-07T12:00:00Z'));
    expect(key).toBe('listings/2026/11/0b8c1a6e-3f4d-4e5a-9b6c-7d8e9f0a1b2c.webp');
    expect(IMAGE_KEY.test(thumbKey(key))).toBe(true);
    for (const bad of ['../etc/passwd', 'listings/2026/11/../../x.webp', 'listings/2026/11/a.webp', `${key}.html`, `/${key}`]) expect(IMAGE_KEY.test(bad)).toBe(false);
    await expect(new MemoryImageStore().put('../x.webp', Buffer.from(''))).rejects.toThrow('Ugyldig');
  });

  it('Vercel Blob: adressen udledes af tokenet; ugyldigt token afvises', () => {
    expect(new BlobImageStore('vercel_blob_rw_AbC123xyz_SECRETpart987').urlFor('listings/x.webp')).toBe('https://abc123xyz.public.blob.vercel-storage.com/listings/x.webp');
    expect(() => new BlobImageStore('sk_live_x')).toThrow('BLOB_READ_WRITE_TOKEN');
  });
});

describe('billed-oprindelse til CSP', () => {
  it('kun https; ugyldige værdier ignoreres i stedet for at lægge siden ned', async () => {
    const { imageOrigin } = await import('./blob-origin');
    expect(imageOrigin({ BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_AbC123_x9' })).toBe('https://abc123.public.blob.vercel-storage.com');
    expect(imageOrigin({ BLOB_PUBLIC_BASE_URL: 'https://cdn.respin.dk/x' })).toBe('https://cdn.respin.dk');
    for (const bad of ['http://cdn.respin.dk', 'javascript:alert(1)', 'ikke en url', "https://x.dk'; script-src *"]) expect(imageOrigin({ BLOB_PUBLIC_BASE_URL: bad })).toBeNull();
    expect(imageOrigin({})).toBeNull();
  });
});
