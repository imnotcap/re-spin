import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/server';
import { getImageStore } from '../../../lib/image-store';
import { feedQuery, listFeed } from '../../../lib/listings';

/** Offentligt feed med medlemmernes annoncer (?category=sko&q=nike&limit=12). Ingen personlige data → kan caches kort i CDN'et. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = feedQuery.safeParse({ category: sp.get('category') || undefined, q: sp.get('q') || undefined, limit: sp.get('limit') || undefined });
  if (!q.success) return NextResponse.json({ error: 'Ugyldig forespørgsel' }, { status: 400 });
  try {
    const items = await listFeed(getDb(), getImageStore(), q.data);
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=20, stale-while-revalidate=60' } });
  } catch (e) {
    console.error('feed-fejl', e instanceof Error ? e.message : 'ukendt');
    return NextResponse.json({ items: [] }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
