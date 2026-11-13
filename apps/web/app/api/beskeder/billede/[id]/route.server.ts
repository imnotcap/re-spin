import { getCurrentSession } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/server';
import { getImageStore } from '../../../../../lib/image-store';
import { messageImageKey } from '../../../../../lib/conversations';

export const runtime = 'nodejs';

/**
 * Viser et billede fra en samtale – kun for samtalens to parter (alt andet er 404, så man ikke kan gætte sig til,
 * hvad der findes). ?str=stor giver det store billede, ellers miniaturen. Lager-adressen sendes aldrig til browseren.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const notFound = () => new Response('Findes ikke', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const current = await getCurrentSession();
  if (!current) return notFound();
  const size = new URL(req.url).searchParams.get('str') === 'stor' ? 'full' : 'thumb';
  const key = await messageImageKey(getDb(), current.user.id, (await params).id, size);
  if (!key) return notFound();
  const file = await getImageStore().get(key);
  if (!file) return notFound();
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline',
      // Privat: må gemmes i brugerens egen browser (billedet ændrer sig aldrig), men ikke i delte caches
      'Cache-Control': 'private, max-age=86400, immutable', Vary: 'Cookie'
    }
  });
}
