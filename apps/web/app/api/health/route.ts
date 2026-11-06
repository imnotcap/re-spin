/** Liveness: afslører hverken version, konfiguration eller afhængigheder. */
export function GET() {
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
