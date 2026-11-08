import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/server';
import { getImageStore } from '../../../lib/image-store';
import { feedQuery, listFeed } from '../../../lib/listings';

/** Offentligt feed med medlemmernes annoncer (?category=kvinder&q=nike&limit=12, eller ?ids=… til favoritter). Ingen personlige data → kan caches kort i CDN'et. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const ids = sp.get('ids');
  const q = feedQuery.safeParse({ category: sp.get('category') || undefined, q: sp.get('q') || undefined, limit: sp.get('limit') || undefined, ids: ids ? ids.split(',').slice(0, 100) : undefined });
  if (!q.success) return NextResponse.json({ error: 'Ugyldig forespørgsel' }, { status: 400 });
  try {
    const items = await listFeed(getDb(), getImageStore(), q.data);
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=20, stale-while-revalidate=60' } });
  } catch (e) {
    console.error('feed-fejl', e instanceof Error ? e.message : 'ukendt');
    return NextResponse.json({ items: [] }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
