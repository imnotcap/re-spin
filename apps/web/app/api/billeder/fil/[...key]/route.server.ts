import { DevFsImageStore } from '../../../../../lib/image-store';

/**
 * KUN udvikling: serverer billeder fra apps/web/.uploads. I produktion (eller med Vercel Blob) svarer ruten 404.
 * Lageret laves her, ikke via getImageStore(): det delte objekt kan komme fra et andet bundle, hvor `instanceof` fejler.
 */
const dev = process.env.NODE_ENV !== 'production' && !process.env.BLOB_READ_WRITE_TOKEN ? new DevFsImageStore() : null;

export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const file = dev ? await dev.read((await params).key.join('/')) : null;
  if (!file) return new Response('Findes ikke', { status: 404 });
  return new Response(new Uint8Array(file), { headers: { 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=3600' } });
}
