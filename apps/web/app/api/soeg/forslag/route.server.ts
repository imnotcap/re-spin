import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '../../../../lib/server';
import { getImageStore } from '../../../../lib/image-store';
import { getSiteStats } from '../../../../lib/site-stats';
import { EMPTY_SUGGESTIONS, suggest } from '../../../../lib/search-suggest';

/**
 * Forslag til søgefeltet, mens man skriver: GET /api/soeg/forslag/?q=…
 * Kun offentlige data (det samme for alle), så svaret må caches kort. Antallet af kald pr. IP begrænses i proxy.server.ts.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 100);
  let body = EMPTY_SUGGESTIONS;
  try {
    body = await suggest(getDb(), getImageStore(), (await getSiteStats()).brands, q);
  } catch (e) {
    console.error('forslag-fejl', e instanceof Error ? e.message : 'ukendt');
  }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=20, s-maxage=30, stale-while-revalidate=60' } });
}
